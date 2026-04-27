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

export default function RegisterScreen({ navigation }) {
  const [username, setUsername]               = useState("");
  const [email, setEmail]                     = useState("");
  const [phone, setPhone]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole]                       = useState("student");
  const [loading, setLoading]                 = useState(false);
  const [alert, setAlert]                     = useState({ type: "", message: "" });

  const showAlert  = (type, message) => setAlert({ type, message });
  const clearAlert = () => setAlert({ type: "", message: "" });

  const roles = [
    { key: "student",  label: "Student"  },
    { key: "lecturer", label: "Lecturer" },
    { key: "prl",      label: "PRL"      },
    { key: "pl",       label: "PL"       },
  ];

  const register = async () => {
    clearAlert();

    if (!username || !email || !password || !phone || !confirmPassword) {
      showAlert("error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      showAlert("error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.register({
        username,
        email,
        phone,
        password,
        role,
      });

      if (result.success) {
        showAlert("success", "Account created successfully! Redirecting to login...");
        setTimeout(() => navigation.replace("Login"), 1200);
      } else {
        showAlert("error", result.error || "Registration failed. Please try again.");
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
        <Text style={s.headerTitle}>Create Account</Text>
        <Text style={s.headerSub}>Register to access the academic system</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AlertBox type={alert.type} message={alert.message} />

        <View style={s.formCard}>
          <FormSection title="Personal Information" />

          <Field
            label="Full Name"
            value={username}
            onChangeText={setUsername}
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <FormSection title="Security" />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secure
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
              />
            </View>
          </View>

          <FormSection title="Role" />

          <View style={s.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[s.roleBtn, role === r.key && s.roleBtnActive]}
                onPress={() => setRole(r.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.roleBtnText, role === r.key && s.roleBtnTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={register}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.submitText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.loginLink}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={s.loginLinkText}>
              Already have an account?{" "}
              <Text style={s.loginLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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

  row: { flexDirection: "row" },

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

  roleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
  },
  roleBtnActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },
  roleBtnTextActive: {
    color: C.white,
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

  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 13,
    color: C.muted,
  },
  loginLinkBold: {
    color: C.navy,
    fontWeight: "700",
  },
});