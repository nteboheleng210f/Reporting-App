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
  Alert,
  ActivityIndicator,
} from "react-native";
import authService from "../services/authService";

const C = {
  navy:   "#0f1f3d",
  navy2:  "#1a2f52",
  gold:   "#c9a84c",
  white:  "#ffffff",
  bg:     "#f5f7fb",
  card:   "#ffffff",
  border: "#e4e8f0",
  text:   "#102040",
  muted:  "#6c7a96",
  badge:  "#edf0f7",
};

function Field({ label, value, onChangeText, placeholder, keyboardType, secure, autoCapitalize }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
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

  const roles = [
    { key: "student",  label: "Student"  },
    { key: "lecturer", label: "Lecturer" },
    { key: "prl",      label: "PRL"      },
    { key: "pl",       label: "PL"       },
  ];

  const register = async () => {
    // Validation
    if (!username || !email || !password || !phone || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters.");
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
        Alert.alert(
          "Success", 
          "Account created successfully!",
          [{ text: "OK", onPress: () => navigation.replace("Login") }]
        );
      } else {
        Alert.alert("Registration Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
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
        <View style={s.formCard}>
          <FormSection title="Personal Information" />

          <Field
            label="Full Name"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. Lerato Mokhosi"
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
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
                placeholder="+266 5000 0000"
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
                placeholder="Min. 6 characters"
                secure
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
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