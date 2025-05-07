import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { getBookings, getPropertyById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useState, useEffect } from "react";
import icons from "@/constants/icons";
import { router } from "expo-router";

const Bookings = () => {
  const { user } = useGlobalContext();
  const [properties, setProperties] = useState<any[]>([]);

  console.log("Bookings - Current user:", user);

  if (!user || !user.$id) {
    console.log("Bookings - User not logged in, redirecting to sign-in");
    router.replace("/sign-in");
    return null;
  }

  const { data: bookings, loading } = useAppwrite({
    fn: getBookings,
    params: { userId: user.$id },
  });

  useEffect(() => {
    const fetchProperties = async () => {
      if (bookings && bookings.length > 0) {
        const propertyPromises = bookings.map((booking: any) =>
          getPropertyById({ id: booking.propertyId })
        );
        const fetchedProperties = await Promise.all(propertyPromises);
        setProperties(fetchedProperties.filter((p) => p !== null));
      }
    };
    fetchProperties();
  }, [bookings]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7"
      >
        <View className="flex flex-row items-center justify-between mt-5">
          <TouchableOpacity
           onPress={() => router.replace('/profile')}
            className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
          >
            <Image source={icons.backArrow} className="size-5" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold">My Bookings</Text>
          <View className="size-11" />
        </View>
        {loading ? (
          <Text className="text-black-300 text-center mt-10">Loading...</Text>
        ) : bookings && bookings.length > 0 ? (
          <View className="mt-5">
            {bookings.map((booking: any, index: number) => {
              const property = properties.find((p) => p.$id === booking.propertyId);
              return (
                <View
                  key={booking.$id}
                  className="border-b border-primary-200 py-4"
                >
                  <Text className="text-lg font-rubik-bold">
                    {property?.name || "Property"}
                  </Text>
                  <Text className="text-black-200">Status: {booking.status}</Text>
                  <Text className="text-black-200">
                    Booked on: {new Date(booking.createdAt).toLocaleString()}
                  </Text>
                  {property && (
                    <TouchableOpacity
                      onPress={() => router.push(`/properties/${property.$id}`)}
                      className="bg-primary-300 p-2 rounded-lg mt-2 w-32"
                    >
                      <Text className="text-white text-center">View Property</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="text-black-300 text-center mt-10">
            No bookings found.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Bookings;