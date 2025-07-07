import { SafeAreaView, ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { getBookings } from "@/lib/appwrite";

const AdminBookings = () => {
  const { user } = useGlobalContext();
  const { data: bookings } = useAppwrite({
    fn: getBookings,
    params: {},
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={icons.backArrow}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-center">
          All Bookings ({bookings?.length || 0})
        </Text>
        <View className="w-6" /> {/* Spacer for alignment */}
      </View>

      <ScrollView className="px-4 mt-4">
        {bookings?.length > 0 ? (
          bookings.map((booking) => (
            <View key={booking._id || booking.$id} className="mb-4 p-4 border border-gray-200 rounded-lg">
              <Text className="text-lg font-semibold">{booking.propertyId?.name || "Unknown Property"}</Text>
              <Text className="text-gray-500 mt-1">User: {booking.userId?.name || "Unknown User"}</Text>
              <Text className="text-gray-500 mt-1">
                Date: {new Date(booking.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 text-center mt-8">No bookings found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminBookings;