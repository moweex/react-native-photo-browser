import { Dimensions, Platform } from 'react-native'
export const isIphoneXorAbove = () => {
    const { width, height } = Dimensions.get('window');
    return (
        Platform.OS === 'ios' &&
        !Platform.isPad &&
        !Platform.isTVOS &&
        ((height === 812 || width === 812) || (height === 896 || width === 896))
    );
}

export const isLandscape = () => {
    const { width, height } = Dimensions.get('window');
    if (width < height) {
        return false
    } else {
        return true;
    }
}

export const getToolbarHeight = () => {
  return isIphoneXorAbove() && !isLandscape() ? 100 : isIphoneXorAbove() && isLandscape() ? 60 : 70
}