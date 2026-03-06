import React, { useState, useEffect, useRef, memo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, Animated, InteractionManager, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { fetchVIPApps, AppItem } from '../../constants/data';
import { Sparkles } from 'lucide-react-native';
import { ListDownloadBtn } from './search';

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const SmartVIPRow = memo(({ item, index, onAccessDenied }: { item: AppItem; index: number; onAccessDenied: () => void }) => {
  const [icon, setIcon] = useState(item.iconUrl);
  useEffect(() => {
    if (icon.includes('ui-avatars')) {
      let searchName = item.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`)
        .then(res => res.json())
        .then(data => { if (data.results && data.results.length > 0) { setIcon(data.results[0].artworkUrl512); item.iconUrl = data.results[0].artworkUrl512; } }).catch(() => {});
    }
  }, []);

  return (
    <View>
      <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={onAccessDenied}>
        <Text style={styles.rankNumber}>{index + 1}</Text>
        <Image source={{ uri: icon }} style={styles.appIconSmall} />
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appSub}>{item.category} • Độc Quyền</Text>
        </View>
        <View pointerEvents="none"><ListDownloadBtn app={item} /></View>
      </TouchableOpacity>
      <View style={styles.divider} />
    </View>
  );
});

export default function VIPScreen() {
  const router = useRouter();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [uiCat, setUiCat] = useState('Tất cả');
  const [listCat, setListCat] = useState('Tất cả');
  const [isUserVip, setIsUserVip] = useState(false);

  const measures = useRef<Record<string, { x: number, width: number }>>({}).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const slideW = useRef(new Animated.Value(0)).current;

  // HÀM ĐỌC THỜI GIAN VIP CHUẨN WEB
  const checkVipStatus = (vipExpireData: any) => {
    if (!vipExpireData) return false;
    let millis = 0;
    if (typeof vipExpireData.toMillis === 'function') millis = vipExpireData.toMillis();
    else if (vipExpireData.seconds) millis = vipExpireData.seconds * 1000;
    else millis = Number(vipExpireData) || 0;
    return millis > Date.now();
  };

  useEffect(() => {
    fetchVIPApps().then((data) => {
      setApps(data);
      const uniqueCats = Array.from(new Set(data.map(app => app.category))).filter(c => c !== 'Khác');
      setCategories(['Tất cả', ...uniqueCats]); setLoading(false);
    });

    let unsubDoc: any;
    if (auth.currentUser) {
      unsubDoc = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists() && checkVipStatus(snap.data().vipExpire)) {
          setIsUserVip(true);
        } else {
          setIsUserVip(false);
        }
      });
    }
    return () => { if (unsubDoc) unsubDoc(); };
  }, []);

  const handleSelectCategory = (cat: string) => {
    if (cat === uiCat) return;
    setUiCat(cat); 
    if (measures[cat]) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: measures[cat].x, useNativeDriver: false, friction: 8, tension: 60 }),
        Animated.spring(slideW, { toValue: measures[cat].width, useNativeDriver: false, friction: 8, tension: 60 })
      ]).start();
    }
    InteractionManager.runAfterInteractions(() => { setListCat(cat); });
  };

  const checkFirewall = async (appId: string) => {
    if (!auth.currentUser) return Alert.alert('Cần đăng nhập', 'Đăng nhập để xem Kho VIP!', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng nhập', onPress: () => router.push('/account') }]);
    
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists() && checkVipStatus(snap.data().vipExpire)) {
         router.push(`/details/${appId}`);
         return;
    }
    Alert.alert('Chỉ dành cho VIP', 'Mở khóa VIP để tải ứng dụng độc quyền!', [{ text: 'Hủy', style: 'cancel' }, { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }]);
  };

  const filteredApps = listCat === 'Tất cả' ? apps : apps.filter(a => a.category === listCat);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Kho VIP <Sparkles color="#FFD700" size={26} strokeWidth={2.5} /></Text>
        <Text style={styles.desc}>Nguồn tải tốc độ cao từ Server riêng</Text>
      </View>
      {loading ? (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FFD700" /></View>) : (
        <>
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <Animated.View style={[styles.slidingPill, { transform: [{ translateX: slideX }], width: slideW }]} />
                {categories.map((cat) => (
                  <TouchableOpacity key={cat} style={styles.catBtn} onLayout={(e) => { const { x, width } = e.nativeEvent.layout; measures[cat] = { x, width }; if (cat === uiCat && slideW as unknown as number === 0) { slideX.setValue(x); slideW.setValue(width); } }} onPress={() => handleSelectCategory(cat)}>
                    <Text style={[styles.catText, uiCat === cat && styles.catTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={{ flex: 1, opacity: uiCat !== listCat ? 0.3 : 1 }}>
            <FlatList data={filteredApps} keyExtractor={(item) => item.id} renderItem={({ item, index }) => <SmartVIPRow item={item} index={index} onAccessDenied={() => checkFirewall(item.id)} />} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} removeClippedSubviews={true} initialNumToRender={8} maxToRenderPerBatch={5} windowSize={3} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingTop: 10, paddingBottom: 120 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 5 },
  largeTitle: { color: '#FFD700', fontSize: 34, fontWeight: '700' },
  desc: { color: '#8E8E93', fontSize: 14, marginTop: 5 },
  categoryContainer: { borderBottomWidth: 0.5, borderBottomColor: '#38383A', paddingBottom: 15, marginBottom: 5, marginTop: 15 },
  catScroll: { paddingHorizontal: 20 },
  slidingPill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#FFD700', borderRadius: 20 },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, zIndex: 2, justifyContent: 'center' },
  catText: { color: '#8E8E93', fontSize: 16, fontWeight: '600' },
  catTextActive: { color: '#000000', fontWeight: '700' }, 
  loadingContainer: { alignItems: 'center', marginTop: 100 },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  rankNumber: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', width: 35, textAlign: 'center', marginRight: 5 },
  appIconSmall: { width: 60, height: 60, borderRadius: 14, backgroundColor: '#1C1C1E', borderWidth: 0.5, borderColor: '#333' },
  appInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  appName: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  appSub: { color: '#8E8E93', fontSize: 13 },
  divider: { height: 0.5, backgroundColor: '#38383A', marginLeft: 120 }
});