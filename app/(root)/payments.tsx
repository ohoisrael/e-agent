import { SafeAreaView, ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { getPayments } from "@/lib/appwrite";
import { useEffect } from "react";

const Payments = () => {
  const { user } = useGlobalContext();
  const { data: payments } = useAppwrite({
    fn: getPayments,
    params: { userId: user?._id || user?.$id },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user || (!user._id && !user.$id)) {
      router.replace("/sign-in");
    }
  }, [user]);

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
          My Payments ({payments?.length || 0})
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="px-4 mt-4">
        {payments && payments.length > 0 ? (
          payments.map((status, index) => (
            <View
              key={index} // Use index as key since response is an array of strings
              className="mb-4 p-4 border border-gray-200 rounded-lg"
            >
              <Text className="text-lg font-semibold">Payment {index + 1}</Text>
              <Text className="text-gray-500 mt-1">Status: {status}</Text>
              
            </View>
          ))
        ) : (
          <Text className="text-gray-500 text-center mt-8">No payments found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Payments;