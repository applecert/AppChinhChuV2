import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// 🔴 SỬ DỤNG LUCIDE CHO ĐỒNG BỘ
import { ChevronLeft, Star, Zap } from 'lucide-react-native';

import * as FileSystem from 'expo-file-system/legacy';
import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';

// 🔴 THÊM FIREBASE ĐỂ LÀM TƯỜNG LỬA CHẶN TẢI APP
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function AppDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [app, setApp] = useState<AppItem | null>(null);
  
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [isFetchingApple, setIsFetchingApple] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      let allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
      let foundApp = allApps.find((a: AppItem) => a.id === id);
      
      if (!foundApp) {
        const [reg, vip] = await Promise.all([fetchRegularApps(), fetchVIPApps()]);
        foundApp = [...reg, ...vip].find((a: AppItem) => a.id === id);
      }
      
      if (foundApp) {
        setApp(foundApp);
        if (!foundApp.screenshots || foundApp.screenshots.length === 0) fetchAppleData(foundApp);
      } else {
        Alert.alert("Lỗi", "Không tìm thấy dữ liệu ứng dụng!");
        router.back();
      }
    };
    loadData();
  }, [id]);

  const fetchAppleData = async (currentApp: AppItem) => {
    setIsFetchingApple(true);
    try {
      let searchName = currentApp.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const appleData = data.results[0];
        setApp(prev => prev ? {
            ...prev,
            iconUrl: appleData.artworkUrl512 || prev.iconUrl,
            screenshots: appleData.screenshotUrls || prev.screenshots,
            description: appleData.description || prev.description
        } : null);
      }
    } catch (error) {}
    setIsFetchingApple(false);
  };

  // 🔴 HÀM ĐỌC THỜI GIAN VIP CỦA WEB:
  const getVipMillis = (vipExpire: any) => {
    if (!vipExpire) return 0;
    if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
    if (vipExpire.seconds) return vipExpire.seconds * 1000;
    return Number(vipExpire) || 0;
  };

  // 🔴 TƯỜNG LỬA CHẶN TẢI KHI KHÔNG CÓ VIP
  const handleSecureDownload = async () => {
    if (!auth.currentUser) {
      return Alert.alert('Cần Đăng Nhập', 'Vui lòng đăng nhập tài khoản trước khi tải ứng dụng!', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/account') }
      ]);
    }

    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const expireMillis = getVipMillis(snap.data().vipExpire);
        
        if (expireMillis > Date.now()) {
          // NẾU CÓ VIP -> GỌI HÀM TẢI THẬT
          handleDownloadReal();
          return;
        }
      }
      
      // NẾU KHÔNG CÓ VIP HOẶC HẾT HẠN -> BẬT POPUP CHẶN
      Alert.alert(
        'Yêu cầu Đặc Quyền VIP', 
        'Để tải kho ứng dụng độc quyền và không chứa quảng cáo, Sếp vui lòng nâng cấp gói VIP nhé!', 
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }
        ]
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xác thực. Vui lòng thử lại.');
    }
  };

  const handleDownloadReal = async () => {
    if (!app) return;
    setDownloadState('loading');
    try {
      const safeName = app.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileUri = FileSystem.documentDirectory + safeName + '.ipa';
      
      const downloadResumable = FileSystem.createDownloadResumable(app.ipaUrl, fileUri, {}, (p) => {
        setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });

      await downloadResumable.downloadAsync();
      setDownloadState('done');
    } catch (error) {
      Alert.alert("Lỗi tải file!");
      setDownloadState('idle');
    }
  };

  if (!app) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#0A84FF" />
          <Text style={styles.backText}>Ứng dụng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerBox}>
          <Image source={{ uri: app.iconUrl }} style={styles.bigIcon} />
          <View style={styles.headerInfo}>
            <View>
                <Text style={styles.title} numberOfLines={2}>{app.name}</Text>
                <Text style={styles.subtitle}>{app.sub}</Text>
            </View>
            
            <View style={styles.actionWrapper}>
              {/* 🔴 NÚT NHẬN NÀY ĐÃ ĐƯỢC GẮN TƯỜNG LỬA */}
              {downloadState === 'idle' && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleSecureDownload}>
                  <Text style={styles.actionText}>NHẬN</Text>
                </TouchableOpacity>
              )}

              {downloadState === 'loading' && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  <Text style={styles.progressTextInner}>{Math.round(progress * 100)}%</Text>
                </View>
              )}
              {downloadState === 'done' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/sign')}>
                  <Text style={styles.actionText}>MỞ</Text>
                </TouchableOpacity>
              )}
              {downloadState === 'done' && (
                <Text style={styles.helperText}>Đã lưu. Vào Thư viện để ký App!</Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.statBox}><Text style={styles.statTop}>{app.rating} <Star size={14} color="#8E8E93" fill="#8E8E93" style={{marginBottom: -2}}/></Text><Text style={styles.statBottom}>ĐÁNH GIÁ</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}><Text style={styles.statTop}>{app.size}</Text><Text style={styles.statBottom}>DUNG LƯỢNG</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}><Text style={styles.statTop}>{app.category || '12+'}</Text><Text style={styles.statBottom}>THỂ LOẠI</Text></View>
        </ScrollView>

        <View style={styles.section}>
          {isFetchingApple ? (
            <ActivityIndicator color="#0A84FF" style={{marginTop: 20}}/>
          ) : (
            app.screenshots && app.screenshots.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshotScroll}>
                {app.screenshots.map((img: string, index: number) => (
                  <View key={index} style={styles.screenshotBox}>
                    <Image source={{ uri: img }} style={styles.screenshotImg} resizeMode="contain" />
                  </View>
                ))}
              </ScrollView>
            )
          )}
        </View>

        <View style={styles.section}>
          {app.modFeatures ? (
            <View style={styles.modBox}>
               <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
                  <Zap size={18} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.modTitle}>Thông tin Mod / Cập nhật</Text>
               </View>
               <Text style={styles.modText}>{app.modFeatures}</Text>
            </View>
          ) : null}

          <Text style={styles.descText} numberOfLines={isDescExpanded ? undefined : 3}>
            {app.description}
          </Text>
          <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{alignSelf: 'flex-end', marginTop: 2}}>
            <Text style={styles.moreText}>{isDescExpanded ? 'Thu gọn' : 'Thêm'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>Nhà phát triển</Text>
          <Text style={styles.devValue}>{app.developer}</Text>
          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>Phiên bản</Text>
          <Text style={styles.devValue}>{app.version}</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: { paddingTop: 50, paddingBottom: 10, backgroundColor: '#000', borderBottomWidth: 0 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  backText: { color: '#0A84FF', fontSize: 17, marginLeft: -5 },
  scrollContent: { paddingBottom: 100 },
  
  headerBox: { flexDirection: 'row', padding: 20 },
  bigIcon: { width: 118, height: 118, borderRadius: 26, backgroundColor: '#1C1C1E', borderWidth: 0.5, borderColor: '#333' },
  headerInfo: { flex: 1, marginLeft: 20, justifyContent: 'space-between' },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { color: '#8E8E93', fontSize: 15, marginTop: 2 },
  
  actionWrapper: { marginTop: 10, alignSelf: 'flex-start' },
  actionBtn: { backgroundColor: '#0A84FF', paddingHorizontal: 22, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  helperText: { color: '#32D74B', fontSize: 11, marginTop: 6, fontWeight: '600' }, 
  
  progressTrack: { width: 85, height: 30, backgroundColor: '#1C1C1E', borderRadius: 15, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#0A84FF' },
  progressTextInner: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center', zIndex: 1, width: '100%' },

  statsScroll: { paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#38383A', marginVertical: 10 },
  statBox: { alignItems: 'center', justifyContent: 'center', width: 110 },
  statTop: { color: '#8E8E93', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statBottom: { color: '#8E8E93', fontSize: 11, fontWeight: '500' },
  statDivider: { width: 0.5, height: 30, backgroundColor: '#38383A', alignSelf: 'center' },

  section: { paddingHorizontal: 20, marginTop: 10 },
  screenshotScroll: { paddingRight: 20 },
  screenshotBox: { width: 260, height: 460, marginRight: 15, backgroundColor: '#1C1C1E', borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: '#333', justifyContent: 'center' },
  screenshotImg: { width: '100%', height: '100%' },
  
  modBox: { backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)' },
  modTitle: { color: '#FFD700', fontSize: 15, fontWeight: '700', marginLeft: 6 },
  modText: { color: '#EBEBF5', fontSize: 14, lineHeight: 22, opacity: 0.9 },
  
  descText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  moreText: { color: '#0A84FF', fontSize: 15, fontWeight: '600' },
  
  dividerFull: { height: 0.5, backgroundColor: '#38383A', marginVertical: 15 },
  devLabel: { color: '#8E8E93', fontSize: 13, marginBottom: 4 },
  devValue: { color: '#FFFFFF', fontSize: 15 }
});