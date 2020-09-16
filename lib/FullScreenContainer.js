import React from "react";
import PropTypes from "prop-types";
import {
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  View,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  ViewPropTypes
} from "react-native";

import ViewPager from '@react-native-community/viewpager';
import { isIphoneXorAbove, isLandscape } from './utils'
import { BottomBar } from "./bar";
import { Photo } from "./media";
import reactotron from "reactotron-react-native";

export default class FullScreenContainer extends React.Component {
  static propTypes = {
    style: ViewPropTypes.style,
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
    delayLongPress: PropTypes.number
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

    this._renderItem = this._renderItem.bind(this);
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
      onScrollEvent: {}
    };
  }

  componentDidMount() {
    DeviceEventEmitter.addListener("didUpdateDimensions", () => {
      this.photoRefs.map(p => p && p.forceUpdate());
      if (this.childPhotoRefs[this.state.currentIndex]) {
        this.resetZoomScale(this.state.currentIndex);
      }
    });

    this.openPage(this.state.currentIndex, false);
  }

  componentWillUnmount() {
    DeviceEventEmitter.removeListener("didUpdateDimensions");
    this.props.indexChanged(this.state.currentIndex);
  }

  resetZoomScale(imageIndex) {
    let index = imageIndex ? imageIndex : 0;
    let image = this.childPhotoRefs[index];
    let { height, width } = Dimensions.get("window");

    if (!image) return;
    if (Platform.OS == "ios") {
      image.setScale(width, height);
    } else {
      image.setScale(1);
    }
    for (let i = 0, len = this.childPhotoRefs.length; i < len; i++) {
      if (i !== this.state.currentIndex && this.childPhotoRefs[i]) {
        if (Platform.OS == "ios") {
          this.childPhotoRefs[i].setScale(width, height);
        } else {
          this.childPhotoRefs[i].setScale(1);
        }
      }
    }
  }

  openPage(index, animated) {
    if (!this.flatListView) {
      return;
    }

    const { mediaList } = this.props;

    const rowCount = mediaList.length;

    if (index < rowCount) {
      if (Platform.OS === "ios") {
        this.flatListView.scrollToIndex({
          index: index,
          animated: animated
        });
      } else {
        this.flatListView.setPageWithoutAnimation(index);
      }

      this._updatePageIndex(index);
    } else {
      this._onScroll(this.state.onScrollEvent);
    }
  }

  _updatePageIndex(index) {
    this.setState(
      {
        currentIndex: index,
        currentMedia: this.props.mediaList[index]
      },
      () => {
        let newTitle;
        this._triggerPhotoLoad(index);

        const { customTitle, mediaList } = this.props;

        const rowCount = mediaList.length;
        if (index + 1 <= rowCount) {
          newTitle = customTitle
            ? customTitle(index + 1, rowCount)
            : `${index + 1} of ${rowCount}`;

          this.props.updateTitle(newTitle);
          this.props.indexChanged(index);
        } else {
          this.openPage(index);
        }
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
    // go back to the first item when there is no more next item
    this.resetZoomScale(this.state.currentIndex);
    if (nextIndex > this.props.mediaList.length - 1) {
      nextIndex = 0;
    }
    this.openPage(nextIndex, false);
  }

  _onPreviousButtonTapped() {
    let prevIndex = this.state.currentIndex - 1;
    // go to the last item when there is no more previous item
    this.resetZoomScale(this.state.currentIndex);
    if (prevIndex < 0) {
      prevIndex = this.props.mediaList.length - 1;
    }
    this.openPage(prevIndex, false);
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

    this.setState({ onScrollEvent: e });
    if (event) {
      const layoutWidth =
        event.layoutMeasurement.width || Dimensions.get("window").width;
      const newIndex = Math.floor(
        (event.contentOffset.x + 0.5 * layoutWidth) / layoutWidth
      );

      reactotron.logImportant("_onScroll newIndex:", newIndex);
      if (newIndex > this.props.mediaList.length) {
        // this._onScroll(e);
      } else {
        this._onPageSelected(newIndex);
      }
    }
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
        setTimeout(() => this.resetZoomScale(currentIndex), 250);
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

  _renderItem({ item, index }) {
    const {
      displaySelectionButtons,
      onMediaSelection,
      useCircleProgress
    } = this.props;

    return (
      <View style={styles.flex}>
        <TouchableWithoutFeedback
          onPress={this._toggleControls}
          onLongPress={this._onPhotoLongPress}
          delayLongPress={this.props.delayLongPress}
        >
          <Photo
            ref={ref => (this.photoRefs[index] = ref)}
            onTap={this._toggleControls}
            lazyLoad
            setChildRef={this.setChildRefFromChild}
            useCircleProgress={useCircleProgress}
            uri={item.photo}
            displaySelectionButtons={displaySelectionButtons}
            selected={item.selected}
            onSelection={isSelected =>
              onMediaSelection(item, index, isSelected)
            }
          />
        </TouchableWithoutFeedback>
      </View>
    );
  }

  getItemLayout = (data, index) => ({
    length: Dimensions.get("window").width,
    offset: Dimensions.get("window").width * index,
    index
  });

  _renderScrollableContent() {
    const { mediaList } = this.props;

    if (Platform.OS === "android") {
      return (
        <ViewPager
          style={styles.flex}
          ref={scrollView => (this.flatListView = scrollView)}
          onPageSelected={this._onPageSelected}
        >
          {mediaList.map((child, idx) =>
            this._renderItem({ item: child, index: idx })
          )}
        </ViewPager>
      );
    }

    return (
      <FlatList
        ref={flatListView => (this.flatListView = flatListView)}
        data={mediaList}
        renderItem={this._renderItem}
        onScroll={this._onScroll}
        keyExtractor={this._keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled
        scrollEventThrottle={16}
        getItemLayout={this.getItemLayout}
        initialScrollIndex={this.state.currentIndex}
      />
    );
  }

  _keyExtractor = item => item.id || item.thumb || item.photo;

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
    const bottomBarHeight = isIphoneXorAbove() && !isLandscape() ? 80 : isIphoneXorAbove() && !isLandscape() ? 50 : 45
    return (
      <View
        style={styles.flex}
        onLayout={() => {
          this.openPage(this.state.currentIndex, false);
        }}
      >
        <StatusBar
          hidden={alwaysDisplayStatusBar || Platform.OS =='android' ? false : !controlsDisplayed}
          showHideTransition={"slide"}
          barStyle={"light-content"}
          animated
          translucent
        />
        {this._renderScrollableContent()}
        <BottomBarComponent
          displayed={controlsDisplayed}
          height={bottomBarHeight}
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
          photoCount={this.props.mediaList.length}
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
