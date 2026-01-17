import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { ChevronUp } from 'lucide-react-native';

interface ScrollToTopButtonProps {
  scrollViewRef: React.RefObject<ScrollView>;
  showThreshold?: number;
}

export default function ScrollToTopButton({ 
  scrollViewRef, 
  showThreshold = 200 
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldShow = scrollY > showThreshold;

    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
      Animated.timing(fadeAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: 0,
        animated: true,
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
          pointerEvents: isVisible ? 'auto' : 'none',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={scrollToTop}
        activeOpacity={0.8}
      >
        <ChevronUp size={24} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#8B5CF6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});