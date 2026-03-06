import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, Keyboard, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, AppItem } from '../../constants/data';

const { width } = Dimensions.get('window');

export const ListDownloadBtn = ({ app }: { app: AppItem }) => {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [prog, setProg] = useState(0);

  const handleDownload = async () => {
    setState('loading');
    try {
      const safeName = app.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileUri = FileSystem.documentDirectory + safeName + '.ipa';
      const dl = FileSystem.createDownloadResumable(app.ipaUrl, fileUri, {}, (p) => {
        setProg(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });
      await dl.downloadAsync();
      setState('done');
    } catch(e) { setState('idle'); }
  };

  if (state === 'done') {
    return (
      <TouchableOpacity style={styles.getButton} onPress={() => router.push('/sign')}>
        <Text style={styles.getButtonText}>MỞ</Text>
      </TouchableOpacity>
    );
  }
  if (state === 'loading') {
    return (
      <View style={styles.getButton}>
        <Text style={styles.getButtonText}>{Math.round(prog*100)}%</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.getButton} onPress={handleDownload}>
      <Text style={styles.getButtonText}>NHẬN</Text>
    </TouchableOpacity>
  );
};

const DISCOVER_CARDS = [
  { id: '1', title: 'Top Ứng Dụng\nĐược Tải Về', color: '#6A92F8', icon: 'trophy' },
  { id: '2', title: 'Top Trò Chơi\nĐược Tải Về', color: '#F8A86A', icon: 'game-controller' },
  { id: '3', title: 'Ứng Dụng\nBán Chạy Nhất', color: '#82D173', icon: 'ribbon' },
  { id: '4', title: 'Trò Chơi\nBán Chạy Nhất', color: '#A28CF8', icon: 'rocket' },
  { id: '5', title: 'Hiệu Suất\n& Tiện Ích', color: '#6AA8F8', icon: 'paper-plane' },
  { id: '6', title: 'Ảnh & Video\nChuyên Nghiệp', color: '#E5C06A', icon: 'camera' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppItem[]>([]);
  const [suggestions, setSuggestions] = useState<AppItem[]>([]);

  // TÍNH NĂNG NHÚN NHẢY THANH SEARCH THEO BÀN PHÍM
  const keyboardOffset = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const kbShow = Keyboard.addListener(showEvent, (e) => {
      Animated.spring(keyboardOffset, {
        toValue: e.endCoordinates.height + 15, // Đẩy lên sát mép bàn phím
        useNativeDriver: false,
        friction: 8, tension: 50
      }).start();
    });

    const kbHide = Keyboard.addListener(hideEvent, () => {
      Animated.spring(keyboardOffset, {
        toValue: 100, // Rơi lại về vị trí cũ
        useNativeDriver: false,
        friction: 8, tension: 50
      }).start();
    });

    return () => { kbShow.remove(); kbHide.remove(); }
  }, []);

  useEffect(() => {
    const allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
    if (allApps.length > 0) {
       setSuggestions(allApps.sort(() => 0.5 - Math.random()).slice(0, 3));
    }
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      const allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
      const filtered = allApps.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const renderResultItem = ({ item }: { item: AppItem }) => (
    <View>
      <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={() => router.push(`/details/${item.id}`)}>
        <Image source={{ uri: item.iconUrl }} style={styles.appIconSmall} />
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appSub}>{item.sub}</Text>
        </View>
        <View onStartShouldSetResponder={() => true}><ListDownloadBtn app={item} /></View>
      </TouchableOpacity>
      <View style={styles.divider} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {query.length > 0 ? (
        <View style={{flex: 1}}>
          <View style={styles.headerSmall}>
             <Text style={styles.smallTitle}>Kết quả tìm kiếm</Text>
          </View>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResultItem}
            contentContainerStyle={styles.scrollContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy kết quả nào.</Text>}
            keyboardShouldPersistTaps="handled"
            onScroll={() => Keyboard.dismiss()} // Cuộn là tự cất bàn phím
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.largeTitle}>Tìm kiếm</Text>
            <TouchableOpacity style={styles.profileBtn}><Text style={styles.profileText}>TQ</Text></TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Được Đề Xuất <Ionicons name="chevron-forward" size={20} color="#8E8E93"/></Text>
          </View>
          {suggestions.map((item, index) => (
             <View key={item.id}>
               <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={() => router.push(`/details/${item.id}`)}>
                 <Image source={{ uri: item.iconUrl }} style={styles.appIconSmall} />
                 <View style={styles.appInfo}>
                   <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
                   <Text style={styles.appSub}>{item.sub}</Text>
                 </View>
                 <View onStartShouldSetResponder={() => true}><ListDownloadBtn app={item} /></View>
               </TouchableOpacity>
               {index < suggestions.length - 1 && <View style={styles.divider} />}
             </View>
          ))}

          <View style={[styles.sectionHeader, {marginTop: 30}]}>
             <Text style={styles.sectionTitle}>Khám Phá <Ionicons name="chevron-forward" size={20} color="#8E8E93"/></Text>
          </View>
          <View style={styles.gridContainer}>
             {DISCOVER_CARDS.map(card => (
               <TouchableOpacity key={card.id} style={[styles.discoverCard, { backgroundColor: card.color }]}>
                  <Ionicons name={card.icon as any} size={36} color="rgba(255,255,255,0.3)" style={styles.cardIconBg} />
                  <Text style={styles.cardTitle}>{card.title}</Text>
               </TouchableOpacity>
             ))}
          </View>
        </ScrollView>
      )}

      {/* GẮN ANIMATED.VIEW ĐỂ ĐẨY THANH SEARCH */}
      <Animated.View style={[styles.floatingSearchContainer, { bottom: keyboardOffset }]}>
        <View style={styles.floatingSearchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" style={{marginLeft: 5, marginRight: 10}} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Trò chơi, ứng dụng, v.v."
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing" // Icon X tự động của iOS
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 180 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  largeTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  profileBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#38383A', justifyContent: 'center', alignItems: 'center' },
  profileText: { color: '#FFF', fontWeight: '600' },
  
  headerSmall: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.5, borderColor: '#333' },
  smallTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },

  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  appIconSmall: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#1C1C1E', borderWidth: 0.5, borderColor: '#333' },
  appInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  appName: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  appSub: { color: '#8E8E93', fontSize: 13 },
  getButton: { backgroundColor: '#2C2C2E', paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16, minWidth: 70, alignItems: 'center' },
  getButtonText: { color: '#0A84FF', fontSize: 15, fontWeight: '700' },
  divider: { height: 0.5, backgroundColor: '#38383A', marginLeft: 100 },
  emptyText: { color: '#8E8E93', textAlign: 'center', marginTop: 40, fontSize: 16 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  discoverCard: { width: (width - 45) / 2, height: 100, borderRadius: 16, padding: 15, marginBottom: 15, overflow: 'hidden', justifyContent: 'flex-end' },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },
  cardIconBg: { position: 'absolute', top: -10, right: -10, transform: [{rotate: '15deg'}] },

  floatingSearchContainer: { position: 'absolute', width: '100%', alignItems: 'center', paddingHorizontal: 20, zIndex: 100 },
  floatingSearchBar: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 20, width: '100%', height: 55, alignItems: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: '#333', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 17, height: '100%' },
});