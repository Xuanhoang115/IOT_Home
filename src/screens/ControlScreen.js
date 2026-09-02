import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import DeviceCard from '../components/DeviceCard';

const devices = [
  {
    id: 1,
    name: 'Air condition',
    room: 'A bed room',
    count: '4 devices',
    icon: '❄️',
    active: true,
  },
  {
    id: 2,
    name: 'Washing Machine',
    room: '',
    count: '1 devices',
    icon: '🧺',
    active: false,
  },
  {
    id: 3,
    name: 'Air purifier',
    room: '',
    count: '4 devices',
    icon: '🌬️',
    active: false,
  },
  {
    id: 4,
    name: 'Dyer',
    room: 'C bedroom',
    count: '1 devices',
    icon: '💨',
    active: true,
  },
];

const categories = [
  'My home',
  'Kitchen',
  'Bathroom',
  'Living room',
];

export default function ControlScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('My home');
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>

        <View style={styles.topRow}>
          <View>
            <Text style={styles.weather}>
              🌤️ 28°C   💧 70%
            </Text>

            <Text style={styles.date}>
              Wed, May 24th
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text>👨🏻</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>
            Control
          </Text>

          <Text style={styles.bell}>
            🔔
          </Text>
        </View>

        {/* SEARCH */}
        <View style={styles.search}>
          <Text>🔍</Text>

          <TextInput
            placeholder="Search..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.welcome}>
          Welcome to "Smart Living"! Take control as you begin your
          seamless journey of home automation
        </Text>

      </View>

      {/* CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ADD DEVICE */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDevice')}
        >
          <Text style={styles.plus}>
            ＋
          </Text>

          <Text style={styles.addText}>
            Add device
          </Text>
        </TouchableOpacity>

        {/* CATEGORY */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
        >
          {categories.map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.category,
                selectedCategory === item &&
                  styles.categoryActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item &&
                    styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* DEVICE */}
        <View style={styles.grid}>
          {filteredDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onPress={() =>
                navigation.navigate('DeviceDetail', {
                  device,
                })
              }
            />
          ))}
        </View>

      </ScrollView>

      {/* BOTTOM */}
      <View style={styles.bottom}>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.navIcon}>◉</Text>
          <Text style={styles.navText}>Control</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.navIcon}>◷</Text>
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3FA',
  },

  header: {
    backgroundColor: '#2850E8',
    padding: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  weather: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },

  date: {
    color: '#DCE4FF',
    fontSize: 9,
    marginTop: 3,
  },

  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },

  title: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: '700',
  },

  bell: {
    fontSize: 20,
  },

  search: {
    height: 36,
    backgroundColor: '#FFF',
    borderRadius: 7,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 10,
  },

  welcome: {
    color: '#FFF',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 12,
  },

  content: {
    padding: 8,
    paddingBottom: 90,
  },

  addButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  plus: {
    color: '#149FF2',
    fontSize: 22,
  },

  addText: {
    fontSize: 9,
    color: '#555',
    marginLeft: 3,
  },

  categoryList: {
    marginVertical: 10,
  },

  category: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    marginRight: 8,
  },

  categoryActive: {
    backgroundColor: '#DDE4FF',
  },

  categoryText: {
    fontSize: 9,
    color: '#444',
  },

  categoryTextActive: {
    color: '#3652D8',
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 62,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  navIcon: {
    textAlign: 'center',
    fontSize: 20,
    color: '#3156DF',
  },

  navText: {
    fontSize: 8,
    color: '#555',
    marginTop: 2,
  },
});