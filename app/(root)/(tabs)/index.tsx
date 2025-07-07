import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMemo, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";
import NoResults from "@/components/NoResults";
import { Card, FeaturedCard } from "@/components/Cards";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { getLatestProperties, getProperties } from "@/lib/appwrite";

export default function Index() {
  const { user, loading: contextLoading, refreshTrigger } = useGlobalContext();

  // Debug: Log the entire context to verify contents
  const context = useGlobalContext();
  useEffect(() => {
    console.log("Index: GlobalContext contents:", context);
    console.log("Index: refreshTrigger changed:", refreshTrigger);
  }, [context, refreshTrigger]);

  const params = useLocalSearchParams<{ query?: string; filter?: string }>();

  const memoizedParams = useMemo(() => ({
    filter: params.filter ?? "All",
    query: params.query ?? "",
    limit: 6,
  }), [params.filter, params.query]);

  const { data: latestProperties, loading: latestLoading } = useAppwrite({
    fn: getLatestProperties,
    refreshTrigger,
  });

  const { data: properties, loading } = useAppwrite({
    fn: getProperties,
    params: memoizedParams,
    refreshTrigger,
  });

  const handleCardPress = (id: string) => router.push(`/properties/${encodeURIComponent(id)}`);

  const memoizedProperties = useMemo(() => properties || [], [properties]);
  const memoizedLatestProperties = useMemo(() => latestProperties || [], [latestProperties]);

  const ListHeaderComponent = useMemo(
    () => () => (
      <View className="px-5">
        <View className="flex flex-row items-center justify-between mt-5">
          <View className="flex flex-row">
            <Image
              source={{ uri: user?.avatar || "https://via.placeholder.com/48" }}
              className="size-12 rounded-full"
              onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
            />
            <View className="flex flex-col items-start ml-2 justify-center">
              <Text className="text-xs font-rubik text-black-100">Good Morning</Text>
              <Text className="text-base font-rubik-medium text-black-300">
                {user?.name || "Guest"}
              </Text>
            </View>
          </View>
          <Image source={icons.bell} className="size-6" />
        </View>
        <View className="my-5">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-xl font-rubik-bold text-black-300">Featured</Text>
          </View>
          {latestLoading ? (
            <ActivityIndicator size="large" className="text-primary-300" />
          ) : !memoizedLatestProperties || memoizedLatestProperties.length === 0 ? (
            <NoResults />
          ) : (
            <FlatList
              data={memoizedLatestProperties}
              renderItem={({ item }) => (
                <FeaturedCard
                  item={item}
                  onPress={() => handleCardPress(item._id)}
                />
              )}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex gap-5 mt-5"
            />
          )}
        </View>
        <View className="mt-5">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-xl font-rubik-bold text-black-300">Our Recommendation</Text>
          </View>
        </View>
      </View>
    ),
    [user?.avatar, user?.name, latestLoading, memoizedLatestProperties]
  );

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={memoizedProperties}
        numColumns={2}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item._id)} />
        )}
        keyExtractor={(item) => item._id}
        contentContainerClassName="pb-32"
        columnWrapperClassName="flex gap-5 px-5"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading || contextLoading ? (
            <ActivityIndicator size="large" className="text-primary-300 mt-5" />
          ) : (
            <NoResults />
          )
        }
        ListHeaderComponent={ListHeaderComponent}
      />
    </SafeAreaView>
  );
}