import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { validateApiKey } from "../services/openai";

export default function LoginScreen() {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { setApiKey: saveApiKey, apiKey: savedKey, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && savedKey && !isNavigating) {
      setIsNavigating(true);
      router.replace("/chat");
    }
  }, [isLoading, savedKey, isNavigating, router]);

  const handleLogin = async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey.startsWith("sk-")) {
      Alert.alert("Invalid API Key", 'API key should start with "sk-"');
      return;
    }

    setIsValidating(true);

    try {
      const isValid = await validateApiKey(trimmedKey);

      if (isValid) {
        await saveApiKey(trimmedKey);
        // Navigation will happen via useEffect
      } else {
        Alert.alert(
          "Invalid API Key",
          "The API key you entered is not valid. Please check and try again."
        );
      }
    } catch {
      Alert.alert(
        "Connection Error",
        "Unable to verify API key. Please check your internet connection and try again."
      );
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading || savedKey) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10a37f" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>AI</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Enter your OpenAI API Key to continue
        </Text>

        <TextInput
          style={styles.input}
          placeholder="sk-..."
          placeholderTextColor="#666"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isValidating}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!apiKey.trim() || isValidating) && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={!apiKey.trim() || isValidating}
        >
          {isValidating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Your API key is stored locally and never shared.
        </Text>

        <TouchableOpacity
          style={styles.helpLink}
          onPress={() =>
            Alert.alert(
              "Get API Key",
              "Visit platform.openai.com to create an account and generate an API key."
            )
          }
        >
          <Text style={styles.helpText}>Dont have an API key?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#212121",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#212121",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#888",
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10a37f",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#2f2f2f",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#444",
  },
  button: {
    backgroundColor: "#10a37f",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    height: 52,
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#1a5c4a",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
  helpLink: {
    marginTop: 24,
    alignItems: "center",
  },
  helpText: {
    color: "#10a37f",
    fontSize: 14,
  },
});
