import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import authService from "../services/authService";

const C = {
  navy:   "#0f1f3d",
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
};

function AlertBox({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <View style={[s.alertBox, isError ? s.alertError : s.alertSuccess]}>
      <Text style={s.alertIcon}>{isError ? "⚠" : "✓"}</Text>
      <Text style={[s.alertText, isError ? s.alertTextError : s.alertTextSuccess]}>
        {message}
      </Text>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType, secure, autoCapitalize }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType || "default"}
        secureTextEntry={secure || false}
        autoCapitalize={autoCapitalize || "sentences"}
      />
    </View>
  );
}

function FormSection({ title }) {
  return (
    <View style={s.formSection}>
      <Text style={s.formSectionText}>{title}</Text>
      <View style={s.formSectionLine} />
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [alert, setAlert]       = useState({ type: "", message: "" });

  const showAlert  = (type, message) => setAlert({ type, message });
  const clearAlert = () => setAlert({ type: "", message: "" });

  const login = async () => {
    clearAlert();

    if (!email.trim() || !password) {
      showAlert("error", "Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(email.trim(), password);

      if (result.success) {
        showAlert("success", "Login successful! Redirecting...");
        setTimeout(() => {
          switch (result.role) {
            case "student":
              navigation.replace("StudentDashboard");
              break;
            case "lecturer":
              navigation.replace("LecturerDashboard");
              break;
            case "prl":
              navigation.replace("PRLDashboard");
              break;
            case "pl":
              navigation.replace("PLDashboard");
              break;
            default:
              showAlert("error", "Unknown user role.");
          }
        }, 800);
      } else {
        showAlert("error", result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      showAlert("error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <Text style={s.eyebrow}>University Portal</Text>
        <Text style={s.headerTitle}>Welcome Back</Text>
        <Text style={s.headerSub}>Sign in to access the academic system</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AlertBox type={alert.type} message={alert.message} />

          <View style={s.formCard}>
            <FormSection title="Credentials" />

            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
            />

            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.6 }]}
              onPress={login}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.submitText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.registerLink}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={s.registerLinkText}>
                Don't have an account?{" "}
                <Text style={s.registerLinkBold}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.navy,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: C.gold,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: C.white,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },

  body: { padding: 16, paddingBottom: 48 },

  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  alertError: {
    backgroundColor: "#fdf2f2",
    borderColor: "#f5c6c6",
  },
  alertSuccess: {
    backgroundColor: "#f0faf4",
    borderColor: "#b7e4c7",
  },
  alertIcon: {
    fontSize: 15,
  },
  alertText: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  alertTextError: {
    color: "#c0392b",
  },
  alertTextSuccess: {
    color: "#1a7a42",
  },

  formCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
  },

  formSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  formSectionText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.navy,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  formSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
  },

  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  submitText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
  },

  registerLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  registerLinkText: {
    fontSize: 13,
    color: C.muted,
  },
  registerLinkBold: {
    color: C.navy,
    fontWeight: "700",
  },
});