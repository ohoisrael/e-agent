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
import { createProperty, updateProperty } from "@/lib/appwrite";

interface PropertyFormProps {
  onClose: () => void;
  property?: any;
  isUpdate?: boolean;
}

const PropertyForm = ({ onClose, property, isUpdate = false }: PropertyFormProps) => {
  const { user, triggerPropertyRefresh } = useGlobalContext(); // Add triggerPropertyRefresh
  const [form, setForm] = useState({
    name: property?.name || "",
    type: property?.type || "",
    price: property?.price?.toString() || "",
    address: property?.address || "",
    bedrooms: property?.bedrooms?.toString() || "",
    bathrooms: property?.bathrooms?.toString() || "",
    area: "11", // hardcoded
    description: property?.description || "",
    facilities: property?.facilities?.join(", ") || "",
    geolocation: property?.geolocation || "5.6082,-0.2528", // default
    images: property?.images?.map((img: string) => ({
      uri: img,
      name: `property_${Date.now()}.jpg`,
      type: "image/jpeg",
    })) || [],
    phone: property?.phone || "",
  });

  const [uploading, setUploading] = useState(false);
  const [types] = useState<string[]>(["House", "SingleRoom", "Apartment", "Chamber&Hall"]);
  const [facilitiesList] = useState<string[]>(["Wifi", "Laundry", "Gym", "Parking"]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(property?.facilities || []);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);

  const inputRefs = {
    name: useRef<TextInput>(null),
    price: useRef<TextInput>(null),
    address: useRef<TextInput>(null),
    bedrooms: useRef<TextInput>(null),
    bathrooms: useRef<TextInput>(null),
    description: useRef<TextInput>(null),
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
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => {
        const extension = asset.uri.split(".").pop()?.toLowerCase();
        const mimeType = extension === "png" ? "image/png" : "image/jpeg";
        const fileName = `property_${Date.now()}_${asset.uri.split("/").pop()}.${extension}`;
        return { uri: asset.uri, name: fileName, type: mimeType };
      });
      setForm({ ...form, images: [...form.images, ...newImages] });
    }
  };

  const removeImage = (index: number) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== index) });
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
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
      (!isUpdate && form.images.length === 0)
    ) {
      Alert.alert("Error", "Please fill all fields and select at least one image");
      return false;
    }

    if (
      isNaN(parseFloat(form.price)) ||
      isNaN(parseInt(form.bedrooms)) ||
      isNaN(parseInt(form.bathrooms))
    ) {
      Alert.alert("Error", "Price, Bedrooms, and Bathrooms must be valid numbers");
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
    const propertyData = {
      name: form.name,
      type: form.type,
      price: parseFloat(form.price),
      address: form.address,
      bedrooms: parseInt(form.bedrooms),
      bathrooms: parseInt(form.bathrooms),
      area: parseFloat(form.area),
      description: form.description,
      facilities: selectedFacilities,
      geolocation: form.geolocation,
      status: property?.status || "available",
      phone: form.phone,
      images: form.images,
    };

    console.log("PropertyForm: Submitting property, isUpdate:", isUpdate);
    if (isUpdate && property?._id) {
      await updateProperty(property._id, propertyData);
      Alert.alert("Success", "Property updated successfully");
    } else {
      console.log("PropertyForm: Calling createProperty with triggerPropertyRefresh");
      await createProperty(propertyData, triggerPropertyRefresh);
      Alert.alert("Success", "Property added successfully");
    }
    onClose();
  } catch (error: any) {
    console.error("PropertyForm: Property submission error:", error);
    Alert.alert("Error", `Failed to ${isUpdate ? "update" : "add"} property: ${error.message}`);
  } finally {
    setUploading(false);
  }
};

  const selectType = (type: string) => {
    setForm({ ...form, type });
    setIsTypeModalVisible(false);
  };

  // Rest of the component (JSX) remains unchanged
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
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
          <TouchableOpacity
            onPress={() => setIsTypeModalVisible(true)}
            className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3"
          >
            <Text className="text-black">{form.type || "Select Type"}</Text>
          </TouchableOpacity>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {facilitiesList.map((facility) => (
                <TouchableOpacity
                  key={facility}
                  onPress={() => toggleFacility(facility)}
                  className={`border p-2 rounded-lg mr-2 ${
                    selectedFacilities.includes(facility) ? "bg-primary-300" : "bg-gray-50"
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
          <TouchableOpacity onPress={pickImage} className="bg-primary-200 p-3 rounded-lg mb-3">
            <Text className="text-white text-center">Select Images</Text>
          </TouchableOpacity>
          {form.images.length > 0 && (
            <FlatList
              data={form.images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View className="relative mr-2">
                  <Image source={{ uri: item.uri }} className="w-32 h-32 rounded-lg" />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 rounded-full w-6 h-6 justify-center items-center"
                  >
                    <Text className="text-white text-xs">X</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          <View className="flex flex-row justify-between">
            <TouchableOpacity onPress={onClose} className="bg-gray-300 p-3 rounded-lg flex-1 mr-2">
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