import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";
import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById, createBooking, createPayment, updatePropertyStatus } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PropertyForm from "@/components/PropertyForm";

const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useGlobalContext();
  const [paying, setPaying] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const router = useRouter();

  const windowHeight = Dimensions.get("window").height;

  const { data: property } = useAppwrite({
    fn: getPropertyById,
    params: {
      id: id!,
    },
  });

  console.log("User:", user);
  console.log("Property:", property);

  const handlePayment = async (status: "success" | "cancelled") => {
    if (!user || !user.$id) {
      Alert.alert("Error", "User not logged in or invalid user ID");
      router.push("/sign-in");
      return;
    }
    if (!property || !property.$id) {
      Alert.alert("Error", "Property data is invalid or not loaded");
      return;
    }

    setPaying(true);
    try {
      const reference = `fake_ref_${Date.now()}`;
      const propertyId = property.$id;
      console.log("Attempting payment with propertyId:", propertyId, "userId:", user.$id, "status:", status);
      if (status === "success") {
        await createBooking({
          userId: user.$id,
          propertyId: propertyId,
          status: "confirmed",
        });
        console.log("Booking created successfully");
        await createPayment({
          userId: user.$id,
          propertyId: propertyId,
          amount: property.price,
          paystackRef: reference,
          status: "success",
        });
        console.log("Payment created successfully");
        await updatePropertyStatus(propertyId, "unavailable");
        console.log("Property status updated successfully");
        Alert.alert("Success", "Payment successful! Property booked.", [
          { text: "OK", onPress: () => router.push("/") }
        ]);
      } else {
        await createPayment({
          userId: user.$id,
          propertyId: propertyId,
          amount: property.price,
          paystackRef: reference,
          status: "cancelled",
        });
        console.log("Payment cancelled successfully");
        Alert.alert("Cancelled", "Payment was cancelled.", [
          { text: "OK", onPress: () => router.push(`/properties/${propertyId}`) }
        ]);
      }
    } catch (error: any) {
      console.error("Payment processing error details:", error);
      Alert.alert("Error", `Payment processing failed: ${error.message}`);
    } finally {
      setPaying(false);
      setShowPaymentModal(false);
    }
  };

  if (!property) return null;

  return (
    <View className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <Image
            source={{ uri: property?.image }}
            className="size-full"
            resizeMode="cover"
          />
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />
          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          >
            <View className="flex flex-row items-center w-full justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>
              <View className="flex flex-row items-center gap-3">
                <Image
                  source={icons.heart}
                  className="size-7"
                  tintColor={"#191D31"}
                />
                <Image source={icons.send} className="size-7" />
              </View>
            </View>
          </View>
        </View>
        <View className="px-5 mt-7 flex gap-2">
          <Text className="text-2xl font-rubik-extrabold">
            {property?.name}
          </Text>
          <View className="flex flex-row items-center gap-3">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property?.type}
              </Text>
            </View>
            <View className="flex flex-row items-center gap-2">
              
            </View>
          </View>
          {user?.role === "admin" && (
            <TouchableOpacity
              onPress={() => setShowEditForm(true)}
              className="bg-primary-200 p-3 rounded-lg mt-4"
            >
              <Text className="text-white text-center">Edit Property</Text>
            </TouchableOpacity>
          )}
          <View className="flex flex-row items-center mt-5">
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
              <Image source={icons.bed} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property?.bedrooms} Beds
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.bath} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property?.bathrooms} Baths
            </Text>
            
          </View>
          <View className="w-full border-t border-primary-200 pt-7 mt-5">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Agent
            </Text>
            <View className="flex flex-col mt-4">
              {property?.phone ? (
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-black-200 text-sm font-rubik-medium">
                    Contact: {property?.phone}
                  </Text>
                  <View className="flex flex-row items-center gap-3">
                    <TouchableOpacity>
                      <Image source={icons.chat} className="size-7" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Image source={icons.phone} className="size-7" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text className="text-black-200 text-sm mt-2 font-rubik-medium">
                  No contact information available
                </Text>
              )}
            </View>
          </View>
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Overview
            </Text>
            <Text className="text-black-200 text-base font-rubik mt-2">
              {property?.description}
            </Text>
          </View>
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Facilities
            </Text>
            {property?.facilities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {property?.facilities.map((item: string, index: number) => {
                  const facility = facilities.find(
                    (facility) => facility.title === item
                  );
                  return (
                    <View
                      key={index}
                      className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                    >
                      <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                        <Image
                          source={facility ? facility.icon : icons.info}
                          className="size-6"
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-black-300 text-sm text-center font-rubik mt-1.5"
                      >
                        {item}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {property?.gallery.length > 0 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Gallery
              </Text>
              <FlatList
                contentContainerStyle={{ paddingRight: 20 }}
                data={property?.gallery}
                keyExtractor={(item) => item.$id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.image }}
                    className="size-40 rounded-xl"
                  />
                )}
                contentContainerClassName="flex gap-4 mt-3"
              />
            </View>
          )}
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Location
            </Text>
            <View className="flex flex-row items-center justify-start mt-4 gap-2">
              <Image source={icons.location} className="w-7 h-7" />
              <Text className="text-black-200 text-sm font-rubik-medium">
                {property?.address}
              </Text>
            </View>
            
          </View>
          {property?.reviews.length > 0 && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center">
                  <Image source={icons.star} className="size-6" />
                  <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                    {property?.rating} ({property?.reviews.length} reviews)
                  </Text>
                </View>
                <TouchableOpacity>
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="mt-5">
                <Comment item={property?.reviews[0]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {user?.role !== "admin" && (
        <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
          <View className="flex flex-row items-center justify-between gap-10">
            <View className="flex flex-col items-start">
              <Text className="text-black-200 text-xs font-rubik-medium">
                Price
              </Text>
              <Text
                numberOfLines={1}
                className="text-primary-300 text-start text-2xl font-rubik-bold"
              >
                ₵{property?.price}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPaymentModal(true)}
              className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400"
              disabled={paying || property.status === "unavailable"}
            >
              <Text className="text-white text-lg text-center font-rubik-bold">
                {paying ? "Processing..." : property.status === "unavailable" ? "Booked" : "Book Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Modal visible={showEditForm} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-white">
          <PropertyForm
            onClose={() => setShowEditForm(false)}
            property={property}
            isUpdate={true}
          />
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showPaymentModal}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-lg w-4/5">
            <Text className="text-xl font-rubik-bold text-black-300 mb-4">
              Confirm Payment
            </Text>
            <Text className="text-base font-rubik-medium text-black-200 mb-2">
              Property: {property?.name}
            </Text>
            <Text className="text-base font-rubik-medium text-black-200 mb-4">
              Amount: ₵{property?.price}
            </Text>
            <View className="flex flex-row justify-between gap-3">
              <TouchableOpacity
                onPress={() => handlePayment("cancelled")}
                className="flex-1 bg-gray-300 py-3 rounded-lg"
                disabled={paying}
              >
                <Text className="text-black-300 text-center font-rubik-bold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handlePayment("success")}
                className="flex-1 bg-primary-300 py-3 rounded-lg"
                disabled={paying}
              >
                <Text className="text-white text-center font-rubik-bold">
                  {paying ? "Processing..." : "Pay Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Property;