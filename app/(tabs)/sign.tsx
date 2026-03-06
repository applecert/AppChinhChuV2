import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JSZip from 'jszip'; 

// 🔴 MỞ CỔNG KẾT NỐI VỚI LÕI NATIVE (IOS/C++)
import { requireNativeModule } from 'expo-modules-core';
const IpaSigner = requireNativeModule('IpaSigner');

// Đã import thêm MoreVertical (Dấu 3 chấm)
import { FileArchive, Share, Trash2, FolderOpen, Layers, Wrench, X, FileKey, CheckCircle2, Rocket, PlusCircle, ShieldCheck, MoreVertical } from 'lucide-react-native';

interface LocalFile { name: string; uri: string; size: string; timestamp: number; }
interface CertItem { id: string; name: string; p12Uri: string; provUri: string; password: string; }

export default function SignScreen() {
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ipa' | 'installed'>('ipa');

  // MENU 3 CHẤM
  const [menuVisible, setMenuVisible] = useState(false);

  // KHO CHỨNG CHỈ 
  const [savedCerts, setSavedCerts] = useState<CertItem[]>([]);
  const [selectedCert, setSelectedCert] = useState<CertItem | null>(null);

  // STATE POPUP
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [selectedIpa, setSelectedIpa] = useState<LocalFile | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // STATE POPUP NHẬP PASS 
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [tempZipData, setTempZipData] = useState<any>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isUnzipping, setIsUnzipping] = useState(false);

  useFocusEffect(useCallback(() => { loadDownloadedFiles(); loadSavedCerts(); }, []));

  // ==========================================
  // HỆ THỐNG QUẢN LÝ FILE IPA
  // ==========================================
  const loadDownloadedFiles = async () => {
    setLoading(true);
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;
      const files = await FileSystem.readDirectoryAsync(dir);
      const ipaFiles = files.filter(f => f.endsWith('.ipa') && !f.startsWith('signed_')); 
      const signedFiles = files.filter(f => f.startsWith('signed_') && f.endsWith('.ipa')); 

      const fileData = await Promise.all(
        (activeTab === 'ipa' ? ipaFiles : signedFiles).map(async (filename) => {
          const fileUri = dir + filename;
          const info = await FileSystem.getInfoAsync(fileUri);
          return { name: filename, uri: fileUri, size: info.exists ? (info.size / 1024 / 1024).toFixed(1) + ' MB' : '0 MB', timestamp: info.exists ? info.modificationTime : 0 };
        })
      );
      fileData.sort((a, b) => b.timestamp - a.timestamp);
      setLocalFiles(fileData as LocalFile[]);
    } catch (error) {}
    setLoading(false);
  };

  useEffect(() => { loadDownloadedFiles(); }, [activeTab]);

  const handleShare = async (uri: string) => { try { const canShare = await Sharing.isAvailableAsync(); if (canShare) await Sharing.shareAsync(uri); } catch (error) {} };
  const handleDelete = (uri: string, name: string) => {
    Alert.alert("Xóa File", `Xóa file ${name}?`, [ { text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: async () => { await FileSystem.deleteAsync(uri); loadDownloadedFiles(); } } ]);
  };

  // 🔴 THÊM MỚI: HÀM IMPORT FILE IPA VÀO APP
  const importIpaFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith('.ipa')) {
        return Alert.alert("Lỗi", "Vui lòng chọn file có đuôi .ipa");
      }

      setLoading(true);
      const dir = FileSystem.documentDirectory;
      const newUri = dir + file.name;

      // Copy file vào thư mục tài liệu của App
      await FileSystem.copyAsync({ from: file.uri, to: newUri });
      Alert.alert("Thành công", "Đã thêm file IPA vào danh sách!");
      loadDownloadedFiles();
    } catch (error: any) {
      setLoading(false);
      Alert.alert("Lỗi", "Không thể thêm file: " + error.message);
    }
  };

  // ==========================================
  // HỆ THỐNG KHO CHỨNG CHỈ
  // ==========================================
  const loadSavedCerts = async () => {
    try {
      const certsJson = await AsyncStorage.getItem('@saved_certs');
      if (certsJson) setSavedCerts(JSON.parse(certsJson));
    } catch (error) {}
  };

  const importCertFromZip = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith('.zip')) return Alert.alert("Lỗi", "Vui lòng chọn tệp .zip chứa chứng chỉ.");

      setIsUnzipping(true);
      
      const b64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const zip = await JSZip.loadAsync(b64Data, { base64: true });

      let p12Data = null, provData = null, p12Name = '', provName = '';

      for (const [path, zipObj] of Object.entries(zip.files)) {
        if (!zipObj.dir) {
          if (path.toLowerCase().endsWith('.p12')) { p12Data = await zipObj.async('base64'); p12Name = path.split('/').pop() || 'cert.p12'; }
          if (path.toLowerCase().endsWith('.mobileprovision')) { provData = await zipObj.async('base64'); provName = path.split('/').pop() || 'cert.mobileprovision'; }
        }
      }

      setIsUnzipping(false);

      if (!p12Data || !provData) return Alert.alert('Lỗi', 'Tệp ZIP không hợp lệ. Bên trong phải chứa ít nhất 1 file .p12 và 1 file .mobileprovision');

      setTempZipData({ p12Data, provData, p12Name, provName, zipName: file.name.replace('.zip', '') });
      setCertPassword('');
      setPwdModalVisible(true);

    } catch (error) {
      setIsUnzipping(false);
      Alert.alert("Lỗi", "Không thể đọc file ZIP này.");
    }
  };

  const saveCertToStorage = async () => {
    if (!certPassword) return Alert.alert("Thiếu", "Vui lòng nhập mật khẩu của file P12");
    
    setPwdModalVisible(false);
    try {
      const certDir = FileSystem.documentDirectory + 'Certs/';
      const dirInfo = await FileSystem.getInfoAsync(certDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(certDir);

      const id = Date.now().toString();
      const p12Uri = certDir + id + '_' + tempZipData.p12Name;
      const provUri = certDir + id + '_' + tempZipData.provName;

      await FileSystem.writeAsStringAsync(p12Uri, tempZipData.p12Data, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(provUri, tempZipData.provData, { encoding: FileSystem.EncodingType.Base64 });

      const newCert: CertItem = { id, name: tempZipData.zipName, p12Uri, provUri, password: certPassword };
      const updatedCerts = [newCert, ...savedCerts]; 
      
      setSavedCerts(updatedCerts);
      await AsyncStorage.setItem('@saved_certs', JSON.stringify(updatedCerts));
      setSelectedCert(newCert); 
      Alert.alert("Thành công", "Chứng chỉ đã được nạp vào hệ thống!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu chứng chỉ vào máy.");
    }
  };

  const deleteCert = async (id: string) => {
    Alert.alert("Xóa Chứng Chỉ", "Bạn muốn xóa chứng chỉ này khỏi máy?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          const updated = savedCerts.filter(c => c.id !== id);
          setSavedCerts(updated);
          await AsyncStorage.setItem('@saved_certs', JSON.stringify(updated));
          if (selectedCert?.id === id) setSelectedCert(null);
      }}
    ]);
  };

  // ==========================================
  // THỰC THI KÝ APP
  // ==========================================
  const handleStartSign = async () => {
    if (!selectedCert || !selectedIpa) return Alert.alert("Thiếu", "Vui lòng chọn đủ File IPA và Chứng chỉ để ký.");
    
    setIsSigning(true);
    try {
      const result = await IpaSigner.signAppOffline(selectedIpa.uri, selectedCert.p12Uri, selectedCert.provUri, selectedCert.password);
      setIsSigning(false);
      setSignModalVisible(false);
      Alert.alert("🎉 KÝ THÀNH CÔNG!", `File IPA mới đã được tạo và sẵn sàng cài đặt!`, [
          { text: "Để sau", style: "cancel", onPress: () => loadDownloadedFiles() }, 
          { text: "Cài Đặt Ngay", onPress: () => { Alert.alert("Thông báo", "Cài đặt: " + result.outputPath); loadDownloadedFiles(); }}
      ]);
    } catch (error: any) {
      setIsSigning(false);
      Alert.alert("Lỗi Ký App", error.message || "Quá trình nhúng chứng chỉ thất bại.");
    }
  };

  // ==========================================
  // GIAO DIỆN
  // ==========================================
  const renderItem = ({ item }: { item: LocalFile }) => (
    <View style={styles.fileCard}>
      <View style={styles.iconBox}><FileArchive color="#0A84FF" size={28} /></View>
      <View style={styles.fileInfo}><Text style={styles.fileName} numberOfLines={2}>{item.name}</Text><Text style={styles.fileSize}>{item.size} • Đã lưu</Text></View>
      <View style={styles.actionGroup}>
        {activeTab === 'ipa' && (
          <TouchableOpacity style={[styles.iconBtn, {backgroundColor: 'rgba(50, 215, 75, 0.15)', borderColor: 'rgba(50, 215, 75, 0.3)', borderWidth: 1}]} onPress={() => { setSelectedIpa(item); setSignModalVisible(true); }}>
            <Wrench color="#32D74B" size={20} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleShare(item.uri)}><Share color="#FFF" size={20} /></TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, {backgroundColor: 'rgba(255, 69, 58, 0.15)'}]} onPress={() => handleDelete(item.uri, item.name)}><Trash2 color="#FF453A" size={20} /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {/* 🔴 THÊM DẤU 3 CHẤM VÀO THANH TIÊU ĐỀ */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <Text style={styles.largeTitle}>Quản Lý Ký App <Wrench color="#0A84FF" size={26} strokeWidth={2.5} /></Text>
          <TouchableOpacity style={{padding: 5}} onPress={() => setMenuVisible(true)}>
            <MoreVertical color="#FFF" size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'ipa' && styles.tabActive]} onPress={() => setActiveTab('ipa')}><Text style={[styles.tabText, activeTab === 'ipa' && styles.tabTextActive]}>File IPA Gốc</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'installed' && styles.tabActive]} onPress={() => setActiveTab('installed')}><Text style={[styles.tabText, activeTab === 'installed' && styles.tabTextActive]}>App Đã Ký</Text></TouchableOpacity>
        </View>
      </View>

      {loading ? ( <ActivityIndicator size="large" color="#0A84FF" style={{marginTop: 50}} /> ) : localFiles.length === 0 ? (
          <View style={styles.centerBox}><FolderOpen color="#333" size={64} strokeWidth={1.5} /><Text style={styles.emptyText}>Kho lưu trữ trống</Text></View>
      ) : (
          <FlatList data={localFiles} keyExtractor={(item) => item.uri} renderItem={renderItem} contentContainerStyle={styles.listContent} /> 
      )}

      {/* ============================================== */}
      {/* 🔴 MENU 3 CHẤM (THÊM IPA / CHỨNG CHỈ) */}
      {/* ============================================== */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); importIpaFile(); }}>
              <PlusCircle color="#0A84FF" size={22} />
              <Text style={styles.menuText}>Thêm File IPA</Text>
            </TouchableOpacity>
            <View style={{height: 1, backgroundColor: '#333'}} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSelectedIpa(null); setSignModalVisible(true); }}>
              <FileKey color="#FFD700" size={22} />
              <Text style={styles.menuText}>Quản Lý Chứng Chỉ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ============================================== */}
      {/* MODAL KÝ APP & QUẢN LÝ KHO CHỨNG CHỈ */}
      {/* ============================================== */}
      <Modal visible={signModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => !isSigning && setSignModalVisible(false)}><X color="#888" size={24} /></TouchableOpacity>
            
            <Text style={styles.modalTitle}>{selectedIpa ? 'CHỌN CHỨNG CHỈ' : 'KHO CHỨNG CHỈ CỦA BẠN'}</Text>
            {selectedIpa && <Text style={styles.modalSub} numberOfLines={1}>File IPA: {selectedIpa.name}</Text>}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}}>
              
              <TouchableOpacity style={styles.addCertBtn} onPress={importCertFromZip} disabled={isUnzipping}>
                 {isUnzipping ? <ActivityIndicator color="#0A84FF" /> : <PlusCircle color="#0A84FF" size={24} />}
                 <Text style={styles.addCertText}>{isUnzipping ? 'Đang giải nén ZIP...' : 'Nhập tệp Chứng chỉ (.zip)'}</Text>
              </TouchableOpacity>

              {savedCerts.length === 0 && <Text style={{color: '#555', textAlign: 'center', marginTop: 20}}>Chưa có chứng chỉ nào được lưu.</Text>}
              
              {savedCerts.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                return (
                  <TouchableOpacity key={cert.id} style={[styles.certCard, isSelected && styles.certCardActive]} onPress={() => setSelectedCert(cert)}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                       {isSelected ? <CheckCircle2 color="#32D74B" size={24} style={{marginRight: 15}}/> : <FileKey color="#555" size={24} style={{marginRight: 15}}/>}
                       <View style={{flex: 1}}>
                         <Text style={[styles.certName, isSelected && {color: '#32D74B'}]}>{cert.name}</Text>
                         <Text style={styles.certSub}>Sẵn sàng để ký</Text>
                       </View>
                    </View>
                    <TouchableOpacity style={{padding: 10}} onPress={() => deleteCert(cert.id)}><Trash2 color="#FF453A" size={18}/></TouchableOpacity>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Chỉ hiện nút Ký khi đang ở chế độ chọn IPA để ký */}
            {selectedIpa && (
              <View style={{paddingTop: 15, borderTopWidth: 1, borderColor: '#222'}}>
                <TouchableOpacity style={[styles.signBtn, (!selectedCert || isSigning) && {opacity: 0.5}]} onPress={handleStartSign} disabled={!selectedCert || isSigning}>
                  {isSigning ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><ActivityIndicator color="#FFF" style={{marginRight: 10}} /><Text style={styles.signBtnText}>ĐANG TIẾM QUYỀN LÕI IPA...</Text></View>
                  ) : (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><Rocket color="#FFF" size={20} style={{marginRight: 8}} /><Text style={styles.signBtnText}>CHẠM ĐỂ KÝ NGAY</Text></View>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* ============================================== */}
      {/* MODAL NHẬP MẬT KHẨU */}
      {/* ============================================== */}
      <Modal visible={pwdModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBgCentered}>
          <View style={styles.pwdBox}>
             <ShieldCheck color="#FFD700" size={50} style={{marginBottom: 15}}/>
             <Text style={styles.pwdTitle}>BẢO MẬT CHỨNG CHỈ</Text>
             <Text style={styles.pwdSub}>Nhập mật khẩu cho tệp {tempZipData?.zipName}</Text>
             <TextInput style={styles.pwdInput} placeholder="Mật khẩu file P12..." placeholderTextColor="#555" secureTextEntry value={certPassword} onChangeText={setCertPassword} autoFocus />
             <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
               <TouchableOpacity style={styles.pwdBtnCancel} onPress={() => setPwdModalVisible(false)}><Text style={{color: '#FFF', fontWeight: 'bold'}}>HỦY BỎ</Text></TouchableOpacity>
               <TouchableOpacity style={styles.pwdBtnSave} onPress={saveCertToStorage}><Text style={{color: '#000', fontWeight: '900'}}>LƯU VÀO KHO</Text></TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.5, borderColor: '#333' },
  largeTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#333' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#333', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  tabText: { color: '#8E8E93', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginTop: 15 },
  emptySubText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 120 }, 
  fileCard: { flexDirection: 'column', backgroundColor: '#111', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  iconBox: { width: 44, height: 44, backgroundColor: 'rgba(10, 132, 255, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  fileSize: { color: '#8E8E93', fontSize: 13 },
  actionGroup: { flexDirection: 'row', gap: 10, marginTop: 15, justifyContent: 'flex-end', paddingTop: 15, borderTopWidth: 0.5, borderColor: '#333' },
  iconBtn: { width: 40, height: 40, backgroundColor: '#222', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // GIAO DIỆN CHỌN CHỨNG CHỈ (MODAL 1)
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#111', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: '#222', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 5, backgroundColor: '#222', borderRadius: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  modalSub: { color: '#0A84FF', fontSize: 14, fontWeight: '600', marginBottom: 20, paddingRight: 30 },
  
  addCertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,132,255,0.1)', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,132,255,0.3)', borderStyle: 'dashed', marginBottom: 20 },
  addCertText: { color: '#0A84FF', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },

  certCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1E', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  certCardActive: { borderColor: '#32D74B', backgroundColor: 'rgba(50,215,75,0.05)' },
  certName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  certSub: { color: '#888', fontSize: 12 },

  signBtn: { backgroundColor: '#0A84FF', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  signBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  // GIAO DIỆN NHẬP PASS (MODAL 2)
  modalBgCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pwdBox: { width: '100%', backgroundColor: '#1C1C1E', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  pwdTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 5 },
  pwdSub: { color: '#888', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  pwdInput: { backgroundColor: '#000', width: '100%', height: 55, borderRadius: 12, paddingHorizontal: 15, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#444', textAlign: 'center', fontWeight: 'bold' },
  pwdBtnCancel: { flex: 1, backgroundColor: '#333', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pwdBtnSave: { flex: 1, backgroundColor: '#FFD700', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // MENU 3 CHẤM 
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  menuBox: { position: 'absolute', top: 100, right: 20, backgroundColor: '#222', borderRadius: 16, width: 220, borderWidth: 1, borderColor: '#444', shadowColor: '#000', shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.5, shadowRadius: 10, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 15 },
  menuText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});