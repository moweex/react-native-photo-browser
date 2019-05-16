import React from "react";
import PropTypes from "prop-types";
import {
  DeviceEventEmitter,
  Dimensions,
  ListView,
  View,
  ViewPagerAndroid,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  ViewPropTypes
} from "react-native";

import Constants from "./constants";
import { BottomBar } from "./bar";
import { Photo } from "./media";
import reactotron from "reactotron-react-native";

export default class FullScreenContainer extends React.Component {
  static propTypes = {
    style: ViewPropTypes.style,
    dataSource: PropTypes.instanceOf(ListView.DataSource).isRequired,
    mediaList: PropTypes.array.isRequired,
    /*
     * opens grid view
     */
    onGridButtonTap: PropTypes.func,

    /*
     * Display top bar
     */
    displayTopBar: PropTypes.bool,

    /*
     * updates top bar title
     */
    updateTitle: PropTypes.func,

    /*
     * displays/hides top bar
     */
    toggleTopBar: PropTypes.func,

    /*
     * refresh the list to apply selection change
     */
    onMediaSelection: PropTypes.func,

    /*
     * those props are inherited from main PhotoBrowser component
     * i.e. index.js
     */
    initialIndex: PropTypes.number,
    alwaysShowControls: PropTypes.bool,
    displayActionButton: PropTypes.bool,
    displayNavArrows: PropTypes.bool,
    alwaysDisplayStatusBar: PropTypes.bool,
    displaySelectionButtons: PropTypes.bool,
    enableGrid: PropTypes.bool,
    useCircleProgress: PropTypes.bool,
    onActionButton: PropTypes.func,
    onPhotoLongPress: PropTypes.func,
    delayLongPress: PropTypes.number,
    titleText: PropTypes.string
  };

  static defaultProps = {
    initialIndex: 0,
    displayTopBar: true,
    displayNavArrows: false,
    alwaysDisplayStatusBar: false,
    displaySelectionButtons: false,
    enableGrid: true,
    onGridButtonTap: () => {},
    onPhotoLongPress: () => {},
    delayLongPress: 1000
  };

  constructor(props, context) {
    super(props, context);

    this._renderRow = this._renderRow.bind(this);
    this._toggleControls = this._toggleControls.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onPageSelected = this._onPageSelected.bind(this);
    this._onNextButtonTapped = this._onNextButtonTapped.bind(this);
    this._onPhotoLongPress = this._onPhotoLongPress.bind(this);
    this._onPreviousButtonTapped = this._onPreviousButtonTapped.bind(this);
    this._onActionButtonTapped = this._onActionButtonTapped.bind(this);
    this.setChildRefFromChild = this.setChildRefFromChild.bind(this);
    this.resetZoomScale = this.resetZoomScale.bind(this);

    this.photoRefs = [];
    this.childPhotoRefs = [];
    this.state = {
      currentIndex: props.initialIndex,
      currentMedia: props.mediaList[props.initialIndex],
      controlsDisplayed: props.displayTopBar,
      layout: {}
    };
  }

  componentDidMount() {
    DeviceEventEmitter.addListener("didUpdateDimensions", () => {
      this.photoRefs.map(p => p && p.forceUpdate());
      this.openPage(this.state.currentIndex, false);
      if (this.childPhotoRefs[this.state.currentIndex]) {
        this.resetZoomScale(this.state.currentIndex);
      }
    });
    this.openPage(this.state.currentIndex, false);
  }

  componentWillUnmount() {
    this.props.indexChanged(this.state.currentIndex);
    DeviceEventEmitter.removeListener("didUpdateDimensions");
    console.log('removeListener("didUpdateDimensions")');
  }

  openPage(index, animated) {
    if (!this.scrollView) {
      return;
    }

    if (Platform.OS === "ios") {
      const screenWidth = Dimensions.get("window").width;
      reactotron.log("openPage_screenWidth", screenWidth);
      this.scrollView.scrollTo({
        x: index * screenWidth,
        animated
      });
    } else {
      this.scrollView.setPageWithoutAnimation(index);
    }
    this._updatePageIndex(index);
  }

  _updatePageIndex(index) {
    this.setState(
      {
        currentIndex: index,
        currentMedia: this.props.mediaList[index]
      },
      () => {
        this._triggerPhotoLoad(index);

        const newTitle = `${
          index < this.props.mediaList.length
            ? index + 1
            : this.props.mediaList.length
        } ${this.props.titleText} ${this.props.dataSource.getRowCount()}`;
        this.props.updateTitle(newTitle);
        this.props.indexChanged(index);
      }
    );
  }

  _triggerPhotoLoad(index) {
    const photo = this.photoRefs[index];
    if (photo) {
      photo.load();
    } else {
      // HACK: photo might be undefined when user taps a photo from gridview
      // that hasn't been rendered yet.
      // photo is rendered after listView's scrollTo method call
      // and i'm deferring photo load method for that.
      setTimeout(this._triggerPhotoLoad.bind(this, index), 200);
    }
  }

  _toggleControls() {
    const { alwaysShowControls, toggleTopBar } = this.props;

    if (!alwaysShowControls) {
      const controlsDisplayed = !this.state.controlsDisplayed;
      this.setState({
        controlsDisplayed
      });
      toggleTopBar(controlsDisplayed);
    }
  }

  _onNextButtonTapped() {
    let nextIndex = this.state.currentIndex + 1;
    this.resetZoomScale(this.state.currentIndex);
    if (nextIndex <= this.props.dataSource.getRowCount() - 1) {
      this.openPage(nextIndex, false);
    }
  }

  _onPreviousButtonTapped() {
    let prevIndex = this.state.currentIndex - 1;
    this.resetZoomScale(this.state.currentIndex);
    if (prevIndex >= 0) {
      this.openPage(prevIndex, false);
    }
  }

  _onActionButtonTapped() {
    const onActionButton = this.props.onActionButton;

    // action behaviour must be implemented by the client
    // so, call the client method or simply ignore this event
    if (onActionButton) {
      const { currentMedia, currentIndex } = this.state;
      onActionButton(currentMedia, currentIndex);
    }
  }

  _onScroll(e) {
    const event = e.nativeEvent;
    const layoutWidth = Dimensions.get("window").width;
    const layoutHeight = Dimensions.get("window").height;
    let newIndex;
    if (
      layoutWidth < layoutHeight &&
      event.layoutMeasurement.width > event.layoutMeasurement.height
    ) {
      newIndex = Math.floor(
        (event.contentOffset.y + 0.5 * layoutWidth) / layoutWidth
      );
    } else {
      newIndex = Math.floor(
        (event.contentOffset.x + 0.5 * layoutWidth) / layoutWidth
      );
    }
    this._onPageSelected(newIndex);
  }

  _onPageSelected(page) {
    const { currentIndex } = this.state;
    let newIndex = page;

    // handle ViewPagerAndroid argument
    if (typeof newIndex === "object") {
      newIndex = newIndex.nativeEvent.position;
    }

    if (currentIndex !== newIndex) {
      if (this.childPhotoRefs[currentIndex]) {
        this.resetZoomScale(currentIndex);
      }
      this._updatePageIndex(newIndex);

      if (this.state.controlsDisplayed && !this.props.displayTopBar) {
        this._toggleControls();
      }
    }
  }
  _onPhotoLongPress() {
    const onPhotoLongPress = this.props.onPhotoLongPress;
    const { currentMedia, currentIndex } = this.state;
    onPhotoLongPress(currentMedia, currentIndex);
  }

  setChildRefFromChild(ref) {
    this.childPhotoRefs.push(ref);
  }

  resetZoomScale(imageIndex) {
    let index = imageIndex ? imageIndex : 0;
    console.log("resetZoomScale index", index);
    let image = this.childPhotoRefs[index];
    // console.log("Image", image);
    if (!image) return;
    image.setScale(Platform.OS == "ios" ? 0.2 : 1);
    for (let i = 0, len = this.childPhotoRefs.length; i < len; i++) {
      if (i !== this.state.currentIndex && this.childPhotoRefs[i]) {
        this.childPhotoRefs[i].setScale(Platform.OS == "ios" ? 0.2 : 1);
      }
    }
  }

  _renderRow(media: Object, sectionID: number, rowID: number) {
    const {
      displaySelectionButtons,
      onMediaSelection,
      useCircleProgress
    } = this.props;

    return (
      <View key={`row_${rowID}`} style={styles.flex}>
        <TouchableWithoutFeedback
          onPress={this._toggleControls}
          onLongPress={this._onPhotoLongPress}
          delayLongPress={this.props.delayLongPress}
        >
          <Photo
            ref={ref => {
              this.photoRefs[rowID] = ref;
            }}
            onTap={this._toggleControls}
            id={rowID}
            setChildRef={this.setChildRefFromChild}
            lazyLoad
            useCircleProgress={useCircleProgress}
            uri={media.photo}
            displaySelectionButtons={displaySelectionButtons}
            selected={media.selected}
            onSelection={isSelected => {
              onMediaSelection(rowID, isSelected);
            }}
          />
        </TouchableWithoutFeedback>
      </View>
    );
  }

  _renderScrollableContent() {
    const { dataSource, mediaList } = this.props;

    if (Platform.OS === "android") {
      return (
        <ViewPagerAndroid
          style={styles.flex}
          ref={scrollView => (this.scrollView = scrollView)}
          onPageSelected={this._onPageSelected}
        >
          {mediaList.map((child, idx) => this._renderRow(child, 0, idx))}
        </ViewPagerAndroid>
      );
    }

    return (
      <ListView
        ref={scrollView => (this.scrollView = scrollView)}
        onLayout={() => {
          this.openPage(this.state.currentIndex, false);
        }}
        dataSource={dataSource}
        renderRow={this._renderRow}
        onScroll={this._onScroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled
        scrollEventThrottle={16}
      />
    );
  }

  render() {
    const {
      displayNavArrows,
      alwaysDisplayStatusBar,
      displayActionButton,
      onGridButtonTap,
      enableGrid
    } = this.props;
    const { controlsDisplayed, currentMedia } = this.state;
    const BottomBarComponent = this.props.bottomBarComponent || BottomBar;

    return (
      <View style={styles.flex}>
        <StatusBar
          hidden={
            alwaysDisplayStatusBar || Platform.OS == "android"
              ? false
              : !controlsDisplayed
          }
          showHideTransition={"slide"}
          barStyle={"light-content"}
          animated
          translucent
        />
        {this._renderScrollableContent()}
        <BottomBarComponent
          displayed={controlsDisplayed}
          height={45}
          displayNavArrows={displayNavArrows}
          displayGridButton={enableGrid}
          displayActionButton={displayActionButton}
          //caption={currentMedia.caption}
          media={currentMedia}
          onPrev={this._onPreviousButtonTapped}
          onNext={this._onNextButtonTapped}
          onGrid={onGridButtonTap}
          onAction={this._onActionButtonTapped}
          currentIndex={this.state.currentIndex}
          photoCount={this.props.dataSource.getRowCount()}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  }
});
