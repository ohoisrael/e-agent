import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { useState, useRef } from "react";
import * as ImagePicker from "expo-image-picker";
import icons from "@/constants/icons";
import { useGlobalContext } from "@/lib/global-provider";
import { createProperty, uploadImage, updateProperty } from "@/lib/appwrite";

interface PropertyFormProps {
  onClose: () => void;
  property?: any; // Existing property data for editing
  isUpdate?: boolean; // Flag to indicate update mode
}

const PropertyForm = ({ onClose, property, isUpdate = false }: PropertyFormProps) => {
  const { user } = useGlobalContext();
  const [form, setForm] = useState({
    name: property?.name || "",
    type: property?.type || "",
    price: property?.price?.toString() || "",
    address: property?.address || "",
    bedrooms: property?.bedrooms?.toString() || "",
    bathrooms: property?.bathrooms?.toString() || "",
    area: property?.area?.toString() || "",
    description: property?.description || "",
    facilities: property?.facilities?.join(", ") || "",
    geolocation: property?.geolocation || "5.6082,-0.2528", // Default to Lapaz, Accra
    image: property?.image ? { uri: property.image, name: `property_${Date.now()}.jpg`, type: "image/jpeg" } : null as { uri: string; name: string; type: string } | null,
    phone: property?.phone || "",
  });
  const [uploading, setUploading] = useState(false);
  const [types] = useState<string[]>(["House", "SingleRoom", "Apartment", "Chamber&Hall"]); // Hardcoded types
  const [facilitiesList] = useState<string[]>(["Wifi", "Laundry", "Gym", "Parking"]); // Hardcoded facilities
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(property?.facilities || []);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false); // For custom dropdown
  const inputRefs = {
    name: useRef<TextInput>(null),
    price: useRef<TextInput>(null),
    address: useRef<TextInput>(null),
    bedrooms: useRef<TextInput>(null),
    bathrooms: useRef<TextInput>(null),
    area: useRef<TextInput>(null),
    description: useRef<TextInput>(null),
    geolocation: useRef<TextInput>(null),
    phone: useRef<TextInput>(null),
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Please allow access to photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      const extension = result.assets[0].uri.split(".").pop()?.toLowerCase();
      const mimeType = extension === "png" ? "image/png" : "image/jpeg";
      const fileName = `property_${Date.now()}.${extension}`;
      setForm({
        ...form,
        image: {
          uri: result.assets[0].uri,
          name: fileName,
          type: mimeType,
        },
      });
    }
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) => {
      if (prev.includes(facility)) {
        return prev.filter((f) => f !== facility); // Deselect if already selected
      } else {
        return [facility]; // Select only the new facility, replacing any previous selection
      }
    });
  };

  const validateForm = () => {
    if (
      !form.name ||
      !form.type ||
      !form.price ||
      !form.address ||
      !form.bedrooms ||
      !form.bathrooms ||
      !form.description ||
      (!isUpdate && !form.image)
    ) {
      Alert.alert("Error", "Please fill all fields and select an image");
      return false;
    }

    if (
      isNaN(parseFloat(form.price)) ||
      isNaN(parseInt(form.bedrooms)) ||
      isNaN(parseInt(form.bathrooms))
    ) {
      Alert.alert("Error", "Price, Bedrooms, Bathrooms, and Area must be valid numbers");
      return false;
    }

    if (!types.includes(form.type)) {
      Alert.alert("Error", `Type must be one of: ${types.join(", ")}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      let fileUrl = form.image?.uri || property?.image;
      if (form.image && form.image.uri !== property?.image) {
        const uploadResult = await uploadImage(form.image);
        fileUrl = uploadResult.fileUrl;
      }

      const propertyData = {
        name: form.name,
        type: form.type,
        price: parseFloat(form.price),
        image: fileUrl,
        address: form.address,
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
        description: form.description,
        facilities: selectedFacilities,
        status: property?.status || "available",
        phone: form.phone,
      };

      if (isUpdate) {
        await updateProperty(property.$id, propertyData);
        Alert.alert("Success", "Property updated successfully");
      } else {
        await createProperty(propertyData);
        Alert.alert("Success", "Property added successfully");
      }
      onClose();
    } catch (error: any) {
      Alert.alert("Error", `Failed to ${isUpdate ? "update" : "add"} property: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const selectType = (type: string) => {
    console.log("Selected type:", type);
    setForm({ ...form, type });
    setIsTypeModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        <View className="bg-white p-5 rounded-lg mx-5 my-3">
          <Text className="text-xl font-rubik-bold mb-4">
            {isUpdate ? "Update Property" : "Add New Property"}
          </Text>
          <TextInput
            ref={inputRefs.name}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Property Name"
            placeholderTextColor="#6B7280"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.price.current?.focus()}
          />
          <View className="mb-3">
            {(
              <TouchableOpacity
                onPress={() => setIsTypeModalVisible(true)}
                className="border border-primary-200 bg-gray-50 p-3 rounded-lg"
              >
                <Text className="text-black">
                  {form.type || "Select Type"}
                </Text>
              </TouchableOpacity>
            )}
            <Modal
              visible={isTypeModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsTypeModalVisible(false)}
            >
              <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white rounded-lg w-3/4 max-h-[300px] p-4">
                  <FlatList
                    data={types}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectType(item)}
                        className="p-3 border-b border-gray-200"
                      >
                        <Text className="text-black text-lg">{item}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text className="text-black text-center">No types available</Text>
                    }
                  />
                  <TouchableOpacity
                    onPress={() => setIsTypeModalVisible(false)}
                    className="mt-4 p-3 bg-gray-300 rounded-lg"
                  >
                    <Text className="text-black text-center">Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
          <TextInput
            ref={inputRefs.price}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Price (₵)"
            placeholderTextColor="#6B7280"
            value={form.price}
            keyboardType="numeric"
            onChangeText={(text) => setForm({ ...form, price: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.address.current?.focus()}
          />
          <TextInput
            ref={inputRefs.address}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Address"
            placeholderTextColor="#6B7280"
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.bedrooms.current?.focus()}
          />
          <TextInput
            ref={inputRefs.bedrooms}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Bedrooms"
            placeholderTextColor="#6B7280"
            value={form.bedrooms}
            keyboardType="numeric"
            onChangeText={(text) => setForm({ ...form, bedrooms: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.bathrooms.current?.focus()}
          />
          <TextInput
            ref={inputRefs.bathrooms}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Bathrooms"
            placeholderTextColor="#6B7280"
            value={form.bathrooms}
            keyboardType="numeric"
            onChangeText={(text) => setForm({ ...form, bathrooms: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.description.current?.focus()}
          />
          <TextInput
            ref={inputRefs.description}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Description"
            placeholderTextColor="#6B7280"
            value={form.description}
            multiline
            numberOfLines={4}
            onChangeText={(text) => setForm({ ...form, description: text })}
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.phone.current?.focus()}
          />
          <View className="mb-3">
            <Text className="text-black-300 font-rubik-medium mb-2">Facilities</Text>
            {user?.role === "admin" && (
              <Text className="text-black-200 text-sm mb-2">Note: Selecting facilities is optional.</Text>
            )}
            {facilitiesList.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {facilitiesList.map((facility) => (
                  <TouchableOpacity
                    key={facility}
                    onPress={() => toggleFacility(facility)}
                    className={`border p-2 rounded-lg mr-2 ${
                      selectedFacilities.includes(facility)
                        ? "bg-primary-300 text-white"
                        : "bg-gray-50"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedFacilities.includes(facility) ? "text-white" : "text-black-300"
                      }`}
                    >
                      {facility}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-black-300">No facilities available</Text>
            )}
          </View>
          <TextInput
            ref={inputRefs.phone}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
            placeholder="Contact Phone Number"
            placeholderTextColor="#6B7280"
            value={form.phone}
            keyboardType="phone-pad"
            onChangeText={(text) => setForm({ ...form, phone: text })}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={pickImage}
            className="bg-primary-200 p-3 rounded-lg mb-3"
          >
            <Text className="text-white text-center">Select Image</Text>
          </TouchableOpacity>
          {form.image && (
            <Image source={{ uri: form.image.uri }} className="w-full h-32 rounded-lg mb-3" />
          )}
          <View className="flex flex-row justify-between">
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-300 p-3 rounded-lg flex-1 mr-2"
            >
              <Text className="text-black text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-primary-300 p-3 rounded-lg flex-1"
              disabled={uploading}
            >
              <Text className="text-white text-center">
                {uploading ? (isUpdate ? "Updating..." : "Adding...") : (isUpdate ? "Update Property" : "Add Property")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default PropertyForm;