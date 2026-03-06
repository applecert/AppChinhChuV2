import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router'; 

// SVG TỪ LUCIDE
import { Fingerprint, User, Mail, Lock, BellRing, Star, Gem, ChevronRight, CloudDownload, Clock, ShieldCheck } from 'lucide-react-native';

import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const GOOGLE_SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const ADMIN_EMAIL = "mquitran@gmail.com"; 

// SỬA LẠI ĐÚNG TÊN BIẾN CỦA WEB: vipExpire
interface UserData { fullname?: string; email?: string; coins?: number; vipExpire?: any; }

export default function AccountScreen() {
  const router = useRouter(); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sysPopup, setSysPopup] = useState({ show: false, msg: '' });

  useEffect(() => {
    let unsubDoc: any;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        unsubDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data() as UserData);
        });
        const snapConfig = await getDoc(doc(db, 'settings', 'config'));
        if (snapConfig.exists() && snapConfig.data().showPopup) setSysPopup({ show: true, msg: snapConfig.data().popupMsg });
      } else {
        setIsLoggedIn(false); setUserData(null);
        if (unsubDoc) unsubDoc();
      }
      setIsLoading(false);
    });
    return () => { unsubscribeAuth(); if (unsubDoc) unsubDoc(); };
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (isRegisterMode && !fullname)) return Alert.alert('Lỗi', 'Nhập đủ thông tin!');
    setIsLoading(true);
    try {
      if (isRegisterMode) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newUserData = { fullname, email: email.toLowerCase(), coins: 0 };
        await setDoc(doc(db, 'users', cred.user.uid), newUserData);
        fetch(GOOGLE_SHEET_WEBHOOK, { method: 'POST', body: JSON.stringify({ email, action: "Tạo Tài Khoản", amount: "0", status: "Thành công" }) }).catch(()=>{});
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) { Alert.alert('Lỗi', 'Thông tin sai!'); }
    finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Rời khỏi hệ thống?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Thoát', style: 'destructive', onPress: async () => { setIsLoading(true); await signOut(auth); setPassword(''); }}]);
  };

  // 🔥 HÀM ĐỌC THỜI GIAN VIP CỦA WEB:
  const getVipMillis = () => {
    if (!userData?.vipExpire) return 0;
    // Tương thích với kiểu Timestamp của Firebase trên Web
    if (typeof userData.vipExpire.toMillis === 'function') return userData.vipExpire.toMillis();
    if (userData.vipExpire.seconds) return userData.vipExpire.seconds * 1000;
    return Number(userData.vipExpire) || 0;
  };

  const vipMillis = getVipMillis();
  const isVipActive = vipMillis > Date.now();

  const getVipRemainingDays = () => {
    if (!isVipActive) return "Chưa có VIP";
    const diff = vipMillis - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + " ngày";
  };

  const renderRow = (IconComponent: any, title: string, value?: string, color: string = '#0A84FF', isLast: boolean = false, onPress?: () => void) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color }]}><IconComponent color="#FFF" size={18} strokeWidth={2.5} /></View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
         <Text style={styles.rowTitle}>{title}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>{value && <Text style={styles.rowValue}>{value}</Text>}<ChevronRight color="#48484A" size={20} /></View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !isLoggedIn && !email) return (<View style={styles.center}><ActivityIndicator size="large" color="#0A84FF" /></View>);

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
         <StatusBar style="light" />
         <View style={styles.authBox}>
            <View style={styles.authLogo}><Fingerprint color="#0A84FF" size={45} strokeWidth={2} /></View>
            <Text style={styles.authTitle}>{isRegisterMode ? 'Đăng Ký' : 'Đăng Nhập'}</Text>
            <Text style={styles.authSub}>Hệ thống lưu trữ IPAVIET Cloud</Text>
            {isRegisterMode && (<View style={styles.inputWrap}><User color="#8E8E93" size={20} style={styles.inputIcon}/><TextInput style={styles.input} placeholder="Tên hiển thị" placeholderTextColor="#555" value={fullname} onChangeText={setFullname} /></View>)}
            <View style={styles.inputWrap}><Mail color="#8E8E93" size={20} style={styles.inputIcon}/><TextInput style={styles.input} placeholder="Email" placeholderTextColor="#555" autoCapitalize="none" value={email} onChangeText={setEmail} /></View>
            <View style={styles.inputWrap}><Lock color="#8E8E93" size={20} style={styles.inputIcon}/><TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor="#555" secureTextEntry value={password} onChangeText={setPassword} /></View>
            <TouchableOpacity style={styles.authBtn} onPress={handleAuth} disabled={isLoading}>{isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnText}>{isRegisterMode ? 'TẠO TÀI KHOẢN' : 'VÀO HỆ THỐNG'}</Text>}</TouchableOpacity>
            <TouchableOpacity style={{marginTop: 20}} onPress={() => setIsRegisterMode(!isRegisterMode)}><Text style={styles.authSwitchText}>{isRegisterMode ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}</Text></TouchableOpacity>
         </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Modal visible={sysPopup.show} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <BellRing color="#FFD700" size={60} strokeWidth={1.5} style={{marginBottom: 10}}/>
            <Text style={styles.modalTitle}>Thông Báo Hệ Thống</Text>
            <Text style={styles.modalMsg}>{sysPopup.msg}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setSysPopup({show: false, msg: ''})}><Text style={styles.modalBtnText}>Đã Hiểu</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}><Text style={styles.largeTitle}>Hồ sơ</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.fullname || userData?.email || 'U')}&background=1C1C1E&color=fff&size=512` }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userData?.fullname || 'Khách hàng'}</Text>
            <Text style={styles.profileEmail}>{userData?.email}</Text>
            {isVipActive ? (
              <View style={styles.vipTag}><Star color="#000" size={12} fill="#000" style={{marginRight: 4}}/><Text style={styles.vipTagText}>VIP: {getVipRemainingDays()}</Text></View>
            ) : (
              <View style={[styles.vipTag, {backgroundColor: '#38383A'}]}><Text style={[styles.vipTagText, {color: '#8E8E93'}]}>Thành viên thường</Text></View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.vipBanner} activeOpacity={0.8} onPress={() => router.push('/buy-vip')}>
          <View style={styles.vipBannerLeft}>
            <Gem color="#FFD700" size={32} strokeWidth={1.5} />
            <View style={{marginLeft: 15}}>
              <Text style={styles.vipBannerTitle}>{isVipActive ? 'Gia Hạn Gói VIP' : 'Nâng Cấp Gói VIP'}</Text>
              <Text style={styles.vipBannerSub}>Mở khóa kho ứng dụng Độc quyền</Text>
            </View>
          </View>
          <ChevronRight color="#FFD700" size={24} />
        </TouchableOpacity>

        <Text style={styles.groupTitle}>TÀI KHOẢN CLOUD</Text>
        <View style={styles.group}>
          {renderRow(CloudDownload, 'Kho lưu trữ Đám mây', '5 GB', '#0A84FF', false)}
          {renderRow(Clock, 'Lịch sử giao dịch', 'Tra cứu', '#32D74B', true)}
        </View>

        {userData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <>
            <Text style={styles.groupTitle}>QUẢN TRỊ HỆ THỐNG</Text>
            <View style={styles.group}>
              {renderRow(ShieldCheck, 'Khu vực Admin', 'Yêu cầu PIN', '#FF453A', true, () => router.push('/admin'))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutText}>Đăng xuất</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  largeTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  authContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 20 },
  authBox: { backgroundColor: '#111', padding: 30, borderRadius: 24, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  authLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(10, 132, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  authTitle: { color: '#FFF', fontSize: 28, fontWeight: '800', marginBottom: 5 },
  authSub: { color: '#8E8E93', fontSize: 14, marginBottom: 30 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 16, height: 55, marginBottom: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#333' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 16, height: '100%' },
  authBtn: { backgroundColor: '#0A84FF', width: '100%', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  authSwitchText: { color: '#0A84FF', fontSize: 14, fontWeight: '600' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 20, borderRadius: 20, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#333' },
  profileInfo: { flex: 1, marginLeft: 15 },
  profileName: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  profileEmail: { color: '#8E8E93', fontSize: 14, marginBottom: 8 },
  vipTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  vipTagText: { color: '#000', fontSize: 12, fontWeight: '800' },
  vipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1700', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#FFD700' },
  vipBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  vipBannerTitle: { color: '#FFD700', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  vipBannerSub: { color: '#D4AF37', fontSize: 13, opacity: 0.8 },
  groupTitle: { color: '#8E8E93', fontSize: 13, fontWeight: '600', marginLeft: 15, marginBottom: 8, marginTop: 10 },
  group: { backgroundColor: '#111', borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 15, backgroundColor: '#111' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingRight: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#222' },
  rowTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  rowValue: { color: '#8E8E93', fontSize: 15, marginRight: 8 },
  logoutBtn: { backgroundColor: '#111', borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#222' },
  logoutText: { color: '#FF453A', fontSize: 17, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#1C1C1E', width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 15 },
  modalMsg: { color: '#EBEBF5', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalBtn: { backgroundColor: '#FFD700', width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  modalBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});