import React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { BarContainer } from './BarContainer';

export default class TopBar extends React.Component {

  static propTypes = {
    displayed: PropTypes.bool,
    title: PropTypes.string,
    height: PropTypes.number,
    backTitle: PropTypes.string,
    backImage: PropTypes.any,
    onBack: PropTypes.func,
    backBtnText: PropTypes.string,
    titleText: PropTypes.string,
  };

  static defaultProps = {
    displayed: false,
    title: '',
    backTitle: '',
    backImage: require('../../Assets/angle-left.png'),
  };

  renderBackButton() {
    const { onBack, backImage, backBtnText } = this.props;

    // do not display back button if there isn't a press handler
      return (
        <TouchableOpacity style={styles.backContainer} onPress={onBack}>
          <View style={{ width: 25, }} />
            <Text style={[styles.text, styles.backText]}>
              {backBtnText}
            </Text>
        </TouchableOpacity>
      );

    return null;
  }

  render() {
    const {
      displayed,
      title,
      height,
      backBtnText,
      titleText
    } = this.props;

    return (
      <BarContainer
        style={styles.container}
        displayed={displayed}
        height={height}
      >
        {this.renderBackButton()}
        <Text style={styles.text}>{title}</Text>
      </BarContainer>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:'flex-end',
    paddingBottom: 10,
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
  backContainer: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
    bottom:10
  },
  backText: {
    marginLeft: -10,
  },
});
