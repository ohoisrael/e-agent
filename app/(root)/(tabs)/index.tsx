import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useCallback, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import icons from "@/constants/icons";

import Search from "@/components/Search";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import { Card, FeaturedCard } from "@/components/Cards";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { getLatestProperties, getProperties } from "@/lib/appwrite";

export default function Index() {
  const { user, loading: contextLoading } = useGlobalContext();

  const params = useLocalSearchParams<{ query?: string; filter?: string }>();

  // Memoize params to prevent unnecessary effect triggers
  const memoizedParams = useMemo(() => ({
    filter: params.filter ?? "All",
    query: params.query ?? "",
    limit: 6,
  }), [params.filter, params.query]);

  const { data: latestProperties, loading: latestPropertiesLoading } =
    useAppwrite({
      fn: getLatestProperties,
    });

  const {
    data: properties,
    refetch,
    loading,
  } = useAppwrite({
    fn: getProperties,
    params: memoizedParams,
  });

  // Debounced refetch to prevent rapid calls
  const debouncedRefetch = useCallback(
    debounce(async (filter?: string, query?: string) => {
      await refetch({
        filter: filter ?? "All",
        query: query ?? "",
        limit: 6,
      });
    }, 300),
    [refetch]
  );

  useEffect(() => {
    debouncedRefetch(memoizedParams.filter, memoizedParams.query);
  }, [memoizedParams.filter, memoizedParams.query, debouncedRefetch]);

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  // Memoize data to prevent unnecessary re-renders
  const memoizedProperties = useMemo(() => properties || [], [properties]);
  const memoizedLatestProperties = useMemo(
    () => latestProperties || [],
    [latestProperties]
  );

  // Memoize the ListHeaderComponent to prevent re-creation
  const ListHeaderComponent = useMemo(() => () => (
    <View className="px-5">
      <View className="flex flex-row items-center justify-between mt-5">
        <View className="flex flex-row">
          <Image
            source={{ uri: user?.avatar || "https://via.placeholder.com/48" }} // Fallback image
            className="size-12 rounded-full"
            onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
          />

          <View className="flex flex-col items-start ml-2 justify-center">
            <Text className="text-xs font-rubik text-black-100">
              Good Morning
            </Text>
            <Text className="text-base font-rubik-medium text-black-300">
              {user?.name || "Guest"}
            </Text>
          </View>
        </View>
        <Image source={icons.bell} className="size-6" />
      </View>

      <Search />

      <View className="my-5">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-xl font-rubik-bold text-black-300">
            Featured
          </Text>
        </View>

        {latestPropertiesLoading ? (
          <ActivityIndicator size="large" className="text-primary-300" />
        ) : !memoizedLatestProperties || memoizedLatestProperties.length === 0 ? (
          <NoResults />
        ) : (
          <FlatList
            data={memoizedLatestProperties}
            renderItem={({ item }) => (
              <FeaturedCard
                item={item}
                onPress={() => handleCardPress(item.$id)}
              />
            )}
            keyExtractor={(item) => item.$id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex gap-5 mt-5"
          />
        )}
      </View>

      <View className="mt-5">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-xl font-rubik-bold text-black-300">
            Our Recommendation
          </Text>
        </View>

        <Filters />
      </View>
    </View>
  ), [user?.avatar, user?.name, latestPropertiesLoading, memoizedLatestProperties]);

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={memoizedProperties}
        numColumns={2}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item.$id)} />
        )}
        keyExtractor={(item) => item.$id}
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

// Debounce function to limit the rate of refetch calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}