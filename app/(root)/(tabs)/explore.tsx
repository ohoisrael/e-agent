import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useDebouncedCallback } from "use-debounce";

import icons from "@/constants/icons";
import Search from "@/components/Search";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";

import { getProperties } from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";

const Explore = () => {
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();
  const [filter, setFilter] = useState(params.filter || "All");
  const [query, setQuery] = useState(params.query || "");
  const [isLoading, setIsLoading] = useState(false); // Local loading state

  const {
    data: properties,
    refetch,
    loading,
    error,
  } = useAppwrite({
    fn: getProperties,
    params: {
      filter,
      query,
    },
    skip: true,
  });

  // Temporary: Remove debounce to test immediate refetch
  const handleRefetch = () => {
    setIsLoading(true);
    console.log("Immediate refetch with filter:", filter, "query:", query);
    refetch({ filter, query }).finally(() => setIsLoading(false));
  };

  // Refetch on every change (no debounce for testing)
  useEffect(() => {
    handleRefetch();
  }, [filter, query, refetch]);

  const handleCardPress = (id: string) => {
    if (!id) {
      console.error("Explore - Invalid property ID:", id);
      return;
    }
    router.push(`/properties/${encodeURIComponent(id)}`);
  };

  if (error) {
    console.error("Explore - Fetch error:", error);
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-black-300">
          Error loading properties: {error.message}. Please try again or contact support.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={properties || []}
        numColumns={2}
        renderItem={({ item }) => (
          <Card
            item={item}
            onPress={() => handleCardPress(item._id)}
          />
        )}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerClassName="pb-32"
        columnWrapperClassName="flex gap-5 px-5"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" className="text-primary-300 mt-5" />
          ) : (
            <NoResults />
          )
        }
        ListHeaderComponent={() => (
          <View className="px-5">
            <View className="flex flex-row items-center justify-between mt-5">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <Text className="text-base mr-2 text-center font-rubik-medium text-black-300">
                Search for Your Ideal Home
              </Text>
              <Image source={icons.bell} className="w-6 h-6" />
            </View>

            <Search query={query} onSearchChange={setQuery} />

            <View className="mt-5">
              

              <Text className="text-xl font-rubik-bold text-black-300 mt-5">
                Found {properties?.length || 0} Properties
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Explore;