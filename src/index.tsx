import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  EasingFunction,
  ImageProps,
  ImageSourcePropType,
  StyleSheet,
  View,
  Image,
} from 'react-native';

import { usePrevious } from './hooks';
import { isEqual } from './helpers';

export interface CrossfadeImageProps extends ImageProps {
  duration?: number;
  easing?: EasingFunction;
  children?: React.ReactNode;
  reverseFade?: boolean;
  customAnimatedImage?: () => Animated.AnimatedComponent<typeof Image> | null | undefined;
}

export const CrossfadeImage = ({
  style,
  source,
  duration = 500,
  easing = Easing.ease,
  children,
  reverseFade = false,
  customAnimatedImage,
  ...props
}: CrossfadeImageProps) => {
  const prevSource = usePrevious(source);
  const nextSource = useRef<ImageSourcePropType>();
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const [oldSource, setOldSource] = useState<ImageSourcePropType>(source);
  const [newSource, setNewSource] = useState<ImageSourcePropType>();

  useLayoutEffect(() => {
    if (prevSource && !isEqual(source, prevSource)) {
      if (!nextSource.current) {
        setNewSource(source);
      }

      nextSource.current = source;
    }
  }, [source, prevSource]);

  const handleUpdate = useCallback(() => {
    // If the source has been changed during animation
    // then update newSource to the saved value,
    // otherwise reset newSource to undefined
    setNewSource(nextSource.current);
    animatedOpacity.setValue(0);

    if (isEqual(oldSource, nextSource.current)) {
      nextSource.current = undefined;
    }
  }, [animatedOpacity, oldSource]);

  const handleLoad = useCallback(() => {
    Animated.timing(animatedOpacity, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: true,
    }).start(() => {
      if (newSource && !isEqual(oldSource, newSource)) {
        // Replace oldSource with newSource,
        // this will trigger handleUpdate
        setOldSource(newSource);
      } else {
        // If oldSource and newSource are the same
        // then explicitly call handleUpdate
        handleUpdate();
      }
    });
  }, [animatedOpacity, oldSource, newSource, duration, easing, handleUpdate]);

  const reverseOpacity = reverseFade
    ? animatedOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    })
    : 1;
  // If customAnimatedImage is undefined, use Animated.Image
  const AnimatedImage = customAnimatedImage ?? Animated.Image
  return (
    <View style={[styles.root, style]}>
      <AnimatedImage
        {...props}
        style={[styles.image, { opacity: reverseOpacity }]}
        source={oldSource}
        fadeDuration={0}
        onLoad={handleUpdate}
      />
      {newSource && (
        <AnimatedImage
          {...props}
          style={[styles.image, { opacity: animatedOpacity }]}
          source={newSource}
          fadeDuration={0}
          onLoad={handleLoad}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
