import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../constants';
import { Spacing, FontSizes, FontWeights } from '../constants';
import { useAuth } from '../utils/authContext';
import { getFollowers, FollowUser } from '../services/followService';
import UserListItem from '../components/UserListItem';

export default function FollowersScreen() {
  const { user, isGuest } = useAuth();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowers();
  }, []);

  const loadFollowers = async () => {
    if (!user || isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { users } = await getFollowers(user.id);
    setFollowers(users);
    setLoading(false);
  };

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Follower</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Melde dich an, um deine Follower zu sehen
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follower</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Du hast noch keine Follower</Text>
          <Text style={styles.emptySubtext}>
            Teile Events und connecte mit anderen, um Follower zu gewinnen
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onPress={() => console.log('Open user profile:', item.id)}
              showFollowButton={true}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.md,
    marginLeft: -Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    color: Colors.gray500,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.lg,
  },
});
