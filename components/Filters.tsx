import React, { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, ScrollView, TouchableOpacity } from "react-native";
import { config, databases } from "@/lib/appwrite";

const Filters = () => {
  const params = useLocalSearchParams<{ filter?: string }>();
  const [selectedCategory, setSelectedCategory] = useState(
    params.filter || "All"
  );
  const [categories, setCategories] = useState<{ title: string; category: string }[]>([
    { title: "All", category: "All" },
  ]); // Initialize with "All"

  // Fetch unique categories from the database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch all properties
        const result = await databases.listDocuments(
          config.databaseId!,
          config.propertiesCollectionId!
        );

        // Extract unique categories from the 'type' field
        const uniqueCategories = Array.from(
          new Set(result.documents.map((doc) => doc.type))
        )
          .filter((category) => category) // Remove null/undefined
          .map((category) => ({
            title: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize
            category,
          }));

        // Update categories state
        setCategories([{ title: "All", category: "All" }, ...uniqueCategories]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory("");
      router.setParams({ filter: "" });
      return;
    }

    setSelectedCategory(category);
    router.setParams({ filter: category });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-3 mb-2"
    >
      {categories.map((item, index) => (
        <TouchableOpacity
          onPress={() => handleCategoryPress(item.category)}
          key={index}
          className={`flex flex-col items-start mr-4 px-4 py-2 rounded-full ${
            selectedCategory === item.category
              ? "bg-primary-300"
              : "bg-primary-100 border border-primary-200"
          }`}
        >
          <Text
            className={`text-sm ${
              selectedCategory === item.category
                ? "text-white font-rubik-bold mt-0.5"
                : "text-black-300 font-rubik"
            }`}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default Filters;