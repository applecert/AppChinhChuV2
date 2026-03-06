import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

// 🔴 SVG TỪ LUCIDE
import { X, Sparkles, CheckCircle, Send, Rocket, Gem } from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const BANK_ID = "ACB"; const ACCOUNT_NO = "22703611"; const ACCOUNT_NAME = "TRAN NGUYEN MINH QUI"; 

// TRUYỀN HẲN COMPONENT SVG VÀO MẢNG
const PACKAGES = [
  { id: '14D', name: 'Trải Nghiệm', price: 20000, days: 14, icon: Send, badge: '' },
  { id: '30D', name: 'VIP 1 Tháng', price: 40000, days: 30, icon: Rocket, badge: '🔥 ĐỀ XUẤT' },
  { id: '1Y', name: 'VIP 1 Năm', price: 300000, days: 365, icon: Gem, badge: 'TIẾT KIỆM 40%' },
];

const VIP_FEATURES = [
  "Mở khóa toàn bộ Kho Ứng Dụng Độc Quyền",
  "Tải App với tốc độ Max Speed không giới hạn",
  "Xóa sạch quảng cáo, không chuyển hướng link",
  "Bảo hành chứng chỉ (Cert) & Hỗ trợ kỹ thuật 24/7"
];

export default function BuyVipScreen() {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState(PACKAGES[1]); 
  const [is14DayEnabled, setIs14DayEnabled] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) setIs14DayEnabled(snap.data().enable14Days !== false);
    };
    fetchSettings();
  }, []);

  const handleCreateOrder = async () => {
    if (!auth.currentUser) return;
    setIsCreatingOrder(true);
    const newOrderId = `IPA${auth.currentUser.uid.substring(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
    try {
      const res = await fetch(`${SCRIPT_URL}?action=create_order&orderId=${newOrderId}&uid=${auth.currentUser.uid}&amount=${selectedPack.price}&coins=${selectedPack.days}`);
      const json = await res.json();
      if (json.success) {
        setOrderId(newOrderId);
        setQrUrl(`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${selectedPack.price}&addInfo=${newOrderId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`);
      } else { Alert.alert('Lỗi tạo đơn', json.error); }
    } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ.'); }
    setIsCreatingOrder(false);
  };

  const checkAutoBanking = async () => {
    if (!orderId) return;
    setIsChecking(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=check_stc_payment&orderId=${orderId}&amount=${selectedPack.price}`);
      const json = await res.json();
      if (json.success) {
        const uid = auth.currentUser!.uid;
        const snap = await getDoc(doc(db, 'users', uid));
        const now = Date.now();
        const currentExpiry = snap.exists() ? (snap.data().vipExpiration || now) : now;
        const addedDays = parseInt(json.coins) || selectedPack.days; 
        const newExpiry = (currentExpiry > now ? currentExpiry : now) + (addedDays * 24 * 60 * 60 * 1000); 

        await updateDoc(doc(db, 'users', uid), { isVip: true, vipExpiration: newExpiry });
        Alert.alert('🎉 Lên VIP Thành Công!', `Tài khoản đã được cộng thêm ${addedDays} ngày VIP!`, [{ text: 'Trải nghiệm ngay', onPress: () => router.back() }]);
      } else { Alert.alert('Chưa nhận được tiền', json.error || 'Vui lòng chờ 10 giây!'); }
    } catch (error) { Alert.alert('Lỗi', 'Mất kết nối.'); }
    setIsChecking(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><X color="#FFF" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>NÂNG CẤP TÀI KHOẢN</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Chọn gói ưu đãi</Text>
        <View style={styles.packWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingVertical: 15}}>
            {PACKAGES.filter(p => p.id !== '14D' || is14DayEnabled).map(pack => {
              const isActive = selectedPack.id === pack.id;
              const isBestSeller = pack.id === '30D';
              const SvgIcon = pack.icon; // Gọi thẻ SVG ra
              return (
                <TouchableOpacity key={pack.id} style={[styles.packCard, isActive && styles.packCardActive, isBestSeller && !isActive && styles.packCardHot]} onPress={() => { setSelectedPack(pack); setOrderId(''); setQrUrl(''); }} activeOpacity={0.8}>
                  {pack.badge ? <View style={[styles.badge, isActive && {backgroundColor: '#FF453A'}]}><Text style={styles.badgeText}>{pack.badge}</Text></View> : null}
                  <SvgIcon color={isActive ? "#FFD700" : "#8E8E93"} size={36} strokeWidth={1.5} style={{marginBottom: 10}} />
                  <Text style={[styles.packName, isActive && { color: '#FFF' }]}>{pack.name}</Text>
                  <Text style={[styles.packPrice, isActive && { color: '#FFD700', fontSize: 20 }]}>{pack.price.toLocaleString('vi-VN')}đ</Text>
                  <Text style={styles.packDays}>Sử dụng {pack.days} ngày</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        <View style={styles.perkCard}>
           <Text style={styles.perkTitle}>Quyền lợi khi là thành viên VIP</Text>
           {VIP_FEATURES.map((feat, idx) => (
             <View key={idx} style={styles.perkRow}>
                <CheckCircle color="#FFD700" size={20} style={{marginRight: 10}} />
                <Text style={styles.perkText}>{feat}</Text>
             </View>
           ))}
        </View>

        {!orderId ? (
          <TouchableOpacity style={styles.createOrderBtn} onPress={handleCreateOrder} disabled={isCreatingOrder}>
            {isCreatingOrder ? <ActivityIndicator color="#000" /> : <Text style={styles.createOrderText}>THANH TOÁN {selectedPack.price.toLocaleString('vi-VN')}đ</Text>}
          </TouchableOpacity>
        ) : (
          <View style={styles.qrBox}>
            <Text style={styles.qrTitle}>Mã QR Thanh Toán Tự Động</Text>
            <View style={styles.qrBorder}>{qrUrl ? <Image source={{ uri: qrUrl }} style={styles.qrImage} /> : <ActivityIndicator size="large" color="#FFD700" style={{height: 200}} />}</View>
            
            <View style={styles.infoBox}>
               <View style={styles.infoRow}><Text style={styles.infoLabel}>Ngân hàng:</Text><Text style={styles.infoValue}>{BANK_ID}</Text></View>
               <View style={styles.infoRow}><Text style={styles.infoLabel}>Chủ TK:</Text><Text style={styles.infoValue}>{ACCOUNT_NAME}</Text></View>
               <View style={styles.infoRow}><Text style={styles.infoLabel}>Số TK:</Text><Text style={styles.infoValue}>{ACCOUNT_NO}</Text></View>
               <View style={styles.infoRow}><Text style={styles.infoLabel}>Số tiền:</Text><Text style={[styles.infoValue, { color: '#FFD700', fontSize: 16 }]}>{selectedPack.price.toLocaleString('vi-VN')} đ</Text></View>
               <View style={styles.infoRow}><Text style={styles.infoLabel}>Nội dung CK:</Text><Text style={[styles.infoValue, { color: '#32D74B', fontSize: 16 }]}>{orderId}</Text></View>
            </View>
            <Text style={styles.warningText}>⚠️ Ghi ĐÚNG NỘI DUNG CHUYỂN KHOẢN để hệ thống tự động duyệt.</Text>
            <TouchableOpacity style={styles.checkBtn} onPress={checkAutoBanking} disabled={isChecking}>
              {isChecking ? <ActivityIndicator color="#000" /> : <Text style={styles.checkBtnText}>TÔI ĐÃ CHUYỂN KHOẢN</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.5, borderColor: '#333' },
  headerTitle: { color: '#FFD700', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  backBtn: { padding: 5, marginLeft: -5 },
  content: { padding: 20, paddingBottom: 100 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 5 },
  packWrapper: { marginBottom: 20 },
  packCard: { width: 140, backgroundColor: '#111', paddingVertical: 25, paddingHorizontal: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#222', position: 'relative' },
  packCardHot: { borderColor: '#555', backgroundColor: '#1A1A1E' },
  packCardActive: { backgroundColor: '#1A1700', borderColor: '#FFD700', transform: [{scale: 1.05}], shadowColor: '#FFD700', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  badge: { position: 'absolute', top: -12, backgroundColor: '#5E5CE6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 2 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  packName: { color: '#8E8E93', fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  packPrice: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  packDays: { color: '#8E8E93', fontSize: 12, fontWeight: '500' },
  perkCard: { backgroundColor: '#111', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  perkTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  perkText: { color: '#EBEBF5', fontSize: 14, flex: 1, lineHeight: 22 },
  createOrderBtn: { backgroundColor: '#FFD700', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  createOrderText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  qrBox: { backgroundColor: '#111', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  qrTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 20 },
  qrBorder: { padding: 10, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20 },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  infoBox: { width: '100%', backgroundColor: '#000', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { color: '#8E8E93', fontSize: 14 },
  infoValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  warningText: { color: '#FF453A', fontSize: 12, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 18 },
  checkBtn: { backgroundColor: '#32D74B', width: '100%', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  checkBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});