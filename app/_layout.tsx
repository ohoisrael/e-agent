import { Stack } from "expo-router";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect, Component, ReactNode } from "react";
import * as SplashScreen from "expo-splash-screen";
import GlobalProvider from "@/lib/global-provider";

// ErrorBoundary to catch and suppress errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    console.warn("Caught error:", error.message);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Suppress specific error
    if (error.message.includes("Maximum update depth exceeded")) {
      console.warn("Suppressed Maximum update depth exceeded error");
      this.setState({ hasError: false }); // Reset to allow rendering
    } else {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return null; // Or render a fallback UI
    }
    return this.props.children;
  }
}

// Prevent auto-hide of splash
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <GlobalProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GlobalProvider>
    </ErrorBoundary>
  );
}