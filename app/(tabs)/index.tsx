import React, { useState, useEffect, memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';

// ==========================================
// THẺ VIP THÔNG MINH: Lướt tới đâu lấy ảnh tới đó
// ==========================================
const SmartVIPCard = memo(({ item }: { item: AppItem }) => {
  const router = useRouter();
  const [icon, setIcon] = useState(item.iconUrl);

  useEffect(() => {
    if (icon.includes('ui-avatars')) {
      let searchName = item.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`)
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            setIcon(data.results[0].artworkUrl512);
            item.iconUrl = data.results[0].artworkUrl512;
          }
        }).catch(() => {});
    }
  }, []);

  return (
    <TouchableOpacity style={styles.hCard} onPress={() => router.push(`/details/${item.id}`)}>
      <Image source={{uri: icon}} style={styles.hIcon}/>
      <Text style={styles.hName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.hSub} numberOfLines={1}>{item.category}</Text>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const [featuredApp, setFeaturedApp] = useState<AppItem | null>(null);
  const [vipApps, setVipApps] = useState<AppItem[]>([]);
  const [newApps, setNewApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([regular, vip]) => {
      if (regular.length > 0) setFeaturedApp(regular[Math.floor(Math.random() * Math.min(regular.length, 10))]);
      setVipApps(vip.slice(0, 8)); // Lấy 8 app VIP cho trang chủ
      setNewApps(regular.slice(0, 5));
      setLoading(false);
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
        
        <View style={styles.header}>
          <Text style={styles.dateText}>HÔM NAY</Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.largeTitle}>Khám phá</Text>
            <TouchableOpacity style={styles.profileBtn}>
              <Image source={{uri: 'https://ui-avatars.com/api/?name=Admin&background=0A84FF&color=fff'}} style={styles.profileImg} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0A84FF" style={{marginTop: 100}}/>
        ) : (
          <>
            {/* THẺ CARD NỔI BẬT TOÀN MÀN HÌNH */}
            {featuredApp && (
              <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9} onPress={() => router.push(`/details/${featuredApp.id}`)}>
                <Image source={{ uri: featuredApp.iconUrl }} style={styles.featuredImage} blurRadius={10} />
                <View style={styles.featuredOverlay}>
                  <Text style={styles.featuredSubtitle}>ĐỀ XUẤT CHO BẠN</Text>
                  <Text style={styles.featuredTitle}>{featuredApp.name}</Text>
                  <Text style={styles.featuredDesc} numberOfLines={2}>{featuredApp.description}</Text>
                </View>
                <Image source={{ uri: featuredApp.iconUrl }} style={styles.featuredIcon} />
              </TouchableOpacity>
            )}

            {/* KHO VIP NỔI BẬT (Sử dụng thẻ thông minh) */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: '#FFD700'}]}>Kho VIP Nổi Bật</Text>
              <Text style={styles.sectionSeeAll} onPress={() => router.push('/vip')}>Xem tất cả</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20, marginBottom: 30}}>
              {vipApps.map((app) => (
                <SmartVIPCard key={app.id} item={app} />
              ))}
            </ScrollView>

            {/* DANH SÁCH APP MỚI NHẤT (Kho thường) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mới Cập Nhật</Text>
            </View>
            <View style={styles.listContainer}>
              {newApps.map((app, index) => (
                <View key={app.id}>
                  <TouchableOpacity style={styles.appRow} onPress={() => router.push(`/details/${app.id}`)}>
                    <Image source={{ uri: app.iconUrl }} style={styles.appIconSmall} />
                    <View style={styles.appInfo}>
                      <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                      <Text style={styles.appSub}>{app.sub}</Text>
                    </View>
                    <TouchableOpacity style={styles.getButton}><Text style={styles.getButtonText}>NHẬN</Text></TouchableOpacity>
                  </TouchableOpacity>
                  {index < newApps.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  dateText: { color: '#8E8E93', fontSize: 13, fontWeight: '700', marginBottom: 5, letterSpacing: 1 },
  largeTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },
  
  featuredCard: { marginHorizontal: 20, height: 400, borderRadius: 20, overflow: 'hidden', marginBottom: 40, backgroundColor: '#1C1C1E', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20 },
  featuredImage: { width: '100%', height: '100%', opacity: 0.6 },
  featuredOverlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 20, paddingTop: 30 },
  featuredSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', marginBottom: 5 },
  featuredTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 10 },
  featuredDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 22 },
  featuredIcon: { position: 'absolute', bottom: 20, left: 20, width: 70, height: 70, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  sectionSeeAll: { color: '#0A84FF', fontSize: 16 },
  
  hCard: { width: 110, marginRight: 15 },
  hIcon: { width: 110, height: 110, borderRadius: 24, backgroundColor: '#1C1C1E', borderWidth: 0.5, borderColor: '#333', marginBottom: 10 },
  hName: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  hSub: { color: '#8E8E93', fontSize: 12, marginTop: 2 },

  listContainer: { paddingHorizontal: 20 },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  appIconSmall: { width: 60, height: 60, borderRadius: 14, backgroundColor: '#1C1C1E', borderWidth: 0.5, borderColor: '#333' },
  appInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  appName: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  appSub: { color: '#8E8E93', fontSize: 13 },
  getButton: { backgroundColor: '#2C2C2E', paddingHorizontal: 20, paddingVertical: 7, borderRadius: 18 },
  getButtonText: { color: '#0A84FF', fontSize: 15, fontWeight: '700' },
  divider: { height: 0.5, backgroundColor: '#38383A', marginLeft: 75 }
});