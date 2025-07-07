import { Image, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import icons from "@/constants/icons";

const BookingPaymentCard = ({ item, type, property }) => {
  const isBooking = type === "booking";
  return (
    <View className="border-b border-primary-200 py-4">
      <Text className="text-lg font-rubik-bold">{property?.name || "Property"}</Text>
      {isBooking ? (
        <>
          <Text className="text-black-200">Status: {item.status}</Text>
          <Text className="text-black-200">
            Booked on: {new Date(item.createdAt).toLocaleString()}
          </Text>
        </>
      ) : (
        <>
          <Text className="text-black-200">Amount: ₵{item.amount}</Text>
          <Text className="text-black-200">Status: {item.status}</Text>
          <Text className="text-black-200">
            Paid on: {new Date(item.createdAt).toLocaleString()}
          </Text>
          <Text className="text-black-200">Paystack Ref: {item.paystackRef}</Text>
        </>
      )}
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
};

export default BookingPaymentCard;