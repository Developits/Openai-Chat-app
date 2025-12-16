import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#212121" },
          }}
        >
          {/* expo-router automatically handles screen rendering */}
        </Stack>
      </ChatProvider>
    </AuthProvider>
  );
}
