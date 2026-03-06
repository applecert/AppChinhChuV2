import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;
const TAB_COUNT = 6; // Sếp có 6 tab: Hôm nay, Ứng dụng, Tìm kiếm, Ký App, VIP, Cá nhân
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;

// ==========================================
// COMPONENT THANH TAB "GIỌT NƯỚC" TÙY CHỈNH
// ==========================================
function FloatingTabBar({ state, descriptors, navigation }: any) {
  // Biến lưu vị trí của "giọt nước" trượt
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_WIDTH,
      tension: 60, // Độ căng của lò xo
      friction: 8,  // Độ mượt
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarElement}>
        {/* HIỆU ỨNG GIỌT NƯỚC (Viên thuốc trượt) */}
        <Animated.View
          style={[
            styles.slidingPill,
            { transform: [{ translateX: slideAnim }] }
          ]}
        />

        {/* CÁC NÚT TAB */}
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Lấy Icon tương ứng
          let iconName = 'ellipse';
          if (route.name === 'index') iconName = isFocused ? 'calendar' : 'calendar-outline';
          if (route.name === 'apps') iconName = isFocused ? 'grid' : 'grid-outline';
          if (route.name === 'search') iconName = isFocused ? 'search' : 'search-outline';
          if (route.name === 'sign') iconName = isFocused ? 'folder-open' : 'folder-outline'; // Thay icon thành Thư mục
          if (route.name === 'vip') iconName = isFocused ? 'star' : 'star-outline';
          if (route.name === 'account') iconName = isFocused ? 'person' : 'person-outline';

          return (
            <TouchableOpacity key={route.name} accessibilityRole="button" onPress={onPress} style={styles.tabItem}>
              <Ionicons 
                name={iconName as any} 
                size={22} 
                color={isFocused ? '#FFFFFF' : '#8E8E93'} 
                style={{ zIndex: 1 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
        <Tabs.Screen name="apps" options={{ title: 'Ứng dụng' }} />
        <Tabs.Screen name="search" options={{ title: 'Tìm kiếm' }} />
        <Tabs.Screen name="sign" options={{ title: 'Thư viện' }} />
        <Tabs.Screen name="vip" options={{ title: 'Kho VIP' }} />
        <Tabs.Screen name="account" options={{ title: 'Cá nhân' }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 25,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  tabBarElement: {
    flexDirection: 'row',
    width: TAB_BAR_WIDTH,
    height: 60,
    backgroundColor: 'rgba(28, 28, 30, 0.95)', // Màu kính tối mờ
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  tabItem: {
    width: TAB_WIDTH - 1.5,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slidingPill: {
    position: 'absolute',
    width: TAB_WIDTH - 10,
    height: 44,
    backgroundColor: '#0A84FF', // Màu giọt nước xanh dương chuẩn iOS
    borderRadius: 22,
    left: 5,
  }
});