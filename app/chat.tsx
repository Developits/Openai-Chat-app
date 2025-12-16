import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  Message,
  MessageContentPart,
  MODELS,
  useChat,
} from "../context/ChatContext";
import { createOpenAI } from "../services/openai";

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const { apiKey } = useAuth();
  const {
    currentConversation,
    selectedModel,
    setSelectedModel,
    createConversation,
    addMessage,
  } = useChat();

  // Derive answers from currentConversation.messages instead of maintaining separate state
  const derivedAnswers = useMemo(() => {
    if (!currentConversation) return [];

    const assistantMessages = currentConversation.messages.filter(
      (msg) => msg.role === "assistant" && typeof msg.content === "string"
    );

    return assistantMessages
      .flatMap((msg) =>
        (msg.content as string).split("\n").filter((line) => line.trim() !== "")
      )
      .reverse(); // Newest first
  }, [currentConversation]);

  // Create initial conversation
  useEffect(() => {
    if (apiKey && !currentConversation) {
      createConversation();
    }
  }, [apiKey, currentConversation, createConversation]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant permission to access photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Fix deprecated ImagePicker.MediaTypeOptions.Images
      allowsMultipleSelection: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(
        (asset) => `data:image/jpeg;base64,${asset.base64}`
      );
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && selectedImages.length === 0) || !apiKey) return;

    // Prepare message content with text and images
    const contentParts: MessageContentPart[] = [];
    if (input.trim()) {
      contentParts.push({ type: "text", text: input.trim() });
    }
    selectedImages.forEach((imageUrl) => {
      contentParts.push({
        type: "image_url",
        image_url: { url: imageUrl, detail: "high" },
      });
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: contentParts,
    };

    // Add user message and clear inputs immediately
    addMessage(userMessage);
    setInput("");
    setSelectedImages([]);
    setIsLoading(true);

    // Process in background
    (async () => {
      try {
        // Create OpenAI client
        const openai = createOpenAI(apiKey);

        // Build messages array with only system prompt and current user message
        // Process each question independently as requested
        const messages = [
          {
            role: "system" as const,
            content:
              "One or more images containing one problem will be uploaded. These are multiple choice questions with five options, A, B, C, D, E. " +
              "Solve the problem internally, and get to an answer (ex. B). Then independently solve the problem once more, and get an answer (ex. B). " +
              "If the answers matches both times, this is the final answer and you only respond with the answer. For example, if I uploaded the question number 21, and you reach the final answer B, you respond: '21 - B'. NO explanation needed. " +
              "If your independently reached answers on both instances don't match, try to resolve the conflict and then reach a final answer. " +
              "And then display the answer in the same way, like '21 - C'. NO explanation needed.",
          },
          { role: "user" as const, content: contentParts },
        ];

        // Call API
        const completion = await openai.chat.completions.create({
          model: selectedModel,
          messages,
        });

        // Capture total tokens from API response
        const totalTokens = completion.usage?.total_tokens || 0;

        // Format the answer with token count
        const rawAnswer = completion.choices[0].message.content || "";
        const formattedAnswer = `${rawAnswer.trim()}    [${totalTokens}]`;

        // Access response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: formattedAnswer,
        };

        addMessage(assistantMessage);
      } catch (error: any) {
        let errorMessage = "Something went wrong. Please try again.";

        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage =
            "Invalid API key. Please check your API key and try again.";
        } else if (error.message.includes("429")) {
          errorMessage =
            "Rate limit exceeded. Please wait a moment and try again.";
        } else if (
          error.message.includes("500") ||
          error.message.includes("502") ||
          error.message.includes("503")
        ) {
          errorMessage = "OpenAI server error. Please try again later.";
        } else if (error.message.includes("model")) {
          errorMessage = `Model "${selectedModel}" is not available. Please select a different model.`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        addMessage({
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${errorMessage}`,
        });
      } finally {
        // Turn off loading indicator when this request completes
        setIsLoading(false);
      }
    })();
  }, [
    input,
    selectedImages,
    apiKey,
    addMessage,
    setInput,
    setSelectedImages,
    setIsLoading,
    selectedModel,
  ]);

  // ✅ Redirect if no API key - declarative approach
  if (!apiKey) {
    return <Redirect href="/" />;
  }

  // The duplicate !apiKey check has been removed (already handled above)

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* Header - Model Selection */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.modelSelector}
            onPress={() => setShowModelPicker(true)}
          >
            <Text style={styles.modelText}>
              {MODELS.find((m) => m.id === selectedModel)?.name ||
                selectedModel}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Main Split Panel Layout */}
        <View style={styles.mainContent}>
          {/* Left Panel - Input Area */}
          <View style={styles.leftPanel}>
            {/* File Upload Section */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: image }}
                      style={styles.imagePreview}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeImageIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Text Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={pickImage}
                >
                  <Text style={styles.imageUploadIcon}>📷</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="Write your question or upload images..."
                  placeholderTextColor="#666"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={4000}
                  editable={true}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !input.trim() &&
                      selectedImages.length === 0 &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!input.trim() && selectedImages.length === 0}
                >
                  <Text style={styles.sendIcon}>↑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Panel - Answer Stack */}
          <View style={styles.rightPanel}>
            <View style={styles.rightPanelHeader}>
              <Text style={styles.rightPanelTitle}>Answers</Text>
            </View>
            <FlatList
              data={derivedAnswers}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.answerCard}>
                  <Text style={styles.answerText}>{item}</Text>
                </View>
              )}
              contentContainerStyle={styles.answerList}
              showsVerticalScrollIndicator={false}
              inverted={false}
              // FlatList performance optimizations
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={10}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: 80, // Approximate height of each answer card
                offset: 80 * index,
                index,
              })}
            />
          </View>
        </View>

        {/* Typing Indicator */}
        {isLoading && (
          <View style={styles.typingIndicator}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#888" />
              <Text style={styles.typingText}>Processing...</Text>
            </View>
          </View>
        )}

        {/* Model Picker Modal */}
        <Modal visible={showModelPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModelPicker(false)}
          >
            <View style={styles.modelPickerContainer}>
              <Text style={styles.modelPickerTitle}>Select Model</Text>
              {MODELS.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    selectedModel === model.id && styles.modelOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedModel(model.id);
                    setShowModelPicker(false);
                  }}
                >
                  <View style={styles.modelOptionInfo}>
                    <Text style={styles.modelOptionText}>{model.name}</Text>
                    <Text style={styles.modelOptionDescription}>
                      {model.description}
                    </Text>
                  </View>
                  {selectedModel === model.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#212121",
  },
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2f2f2f",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownIcon: {
    color: "#888",
    fontSize: 10,
    marginLeft: 8,
  },
  // Split Panel Layout
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
  // Left Panel (Input Area)
  leftPanel: {
    flex: 1,
    backgroundColor: "#212121",
    padding: 16,
    justifyContent: "flex-end",
  },
  // Image Upload Section
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    maxHeight: 150,
    overflow: "scroll",
  },
  imagePreviewWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageIcon: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Input Area
  inputWrapper: {
    marginBottom: Platform.OS === "ios" ? 20 : 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#2f2f2f",
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
  },
  imageUploadButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  imageUploadIcon: {
    fontSize: 20,
    color: "#888",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: "#10a37f",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#444",
  },
  sendIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Right Panel (Answer Stack)
  rightPanel: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderLeftWidth: 1,
    borderLeftColor: "#333",
  },
  rightPanelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  rightPanelTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  answerList: {
    padding: 16,
  },
  answerCard: {
    backgroundColor: "#2f2f2f",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  answerText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
  // Message Components (hidden but styles kept)
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    marginBottom: 16,
    flexDirection: "row",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  assistantMessage: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10a37f",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarError: {
    backgroundColor: "#ef4444",
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  messageContent: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
  },
  userMessageContent: {
    backgroundColor: "#2f2f2f",
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    color: "#fca5a5",
  },
  typingIndicator: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  typingText: {
    color: "#888",
    marginLeft: 8,
    fontSize: 14,
  },
  // Model Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modelPickerContainer: {
    backgroundColor: "#2f2f2f",
    borderRadius: 16,
    padding: 8,
    width: "85%",
    maxWidth: 340,
  },
  modelPickerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    padding: 16,
    textAlign: "center",
  },
  modelOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  modelOptionSelected: {
    backgroundColor: "#3a3a3a",
  },
  modelOptionInfo: {
    flex: 1,
  },
  modelOptionText: {
    color: "#fff",
    fontSize: 16,
  },
  modelOptionDescription: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    color: "#10a37f",
    fontSize: 18,
    fontWeight: "bold",
  },
});
