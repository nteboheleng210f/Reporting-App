import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

// ─────────────────────────────────────────
// SVG-STYLE GEOMETRIC CIRCLES (pure Views)
// ─────────────────────────────────────────
const Geo = ({ size, borderW, color, style }) => (
  <View
    style={[
      {
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderW,
        borderColor: color,
      },
      style,
    ]}
  />
);


const Field = ({ label, value, onChangeText, placeholder, secure, keyboardType }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, focused && styles.fieldFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c4c9d4"
        secureTextEntry={secure}
        autoCapitalize="none"
        keyboardType={keyboardType || "default"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
};

// ─────────────────────────────────────────
// MAIN LOGIN SCREEN
// ─────────────────────────────────────────
export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  
  const login = async () => {
    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = userCred.user.uid;
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        alert("User profile not found. Contact your administrator.");
        setLoading(false);
        return;
      }

      const role = snap.data().role;

      switch (role) {
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
          alert("Unknown role: " + role);
      }
    } catch (error) {
      alert(error.message);
    }

    setLoading(false);
  };

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0c1a3a" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >



      
        <View style={styles.formPanel}>

          <Text style={styles.portalLabel}>LOGIN PORTAL</Text>
          <Text style={styles.formTitle}>Sign in to LUCT</Text>
          <Text style={styles.formSub}>
          Enter your credentials
          </Text>

          <Field
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secure
          />


          {/* SIGN IN BUTTON */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && { opacity: 0.7 }]}
            onPress={login}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.signInText}> Login</Text>}
          </TouchableOpacity>

          {/* DIVIDER */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>New to LUCT?</Text>
            <View style={styles.divLine} />
          </View>

          {/* REGISTER LINK */}
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerLink}>Create one</Text>
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: "#0c1a3a",
  },

  scroll: {
    flexGrow: 1,
  },

  // ── BRAND PANEL ──
  brandPanel: {
    backgroundColor: "#0c1a3a",
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 28,
    minHeight: 280,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  geoFill: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(91,110,245,0.1)",
    bottom: 120,
    left: 24,
  },

  brandTop: {
    zIndex: 2,
  },

  crestBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#5b6ef5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  crestIconWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
  },

  crestBar: {
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#fff",
  },

  uniName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 26,
    marginBottom: 6,
  },

  uniTag: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    fontWeight: "600",
  },

  brandBottom: {
    zIndex: 2,
    marginTop: 30,
  },

  quote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
    fontStyle: "italic",
    marginBottom: 14,
  },

  dots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  dotActive: {
    width: 18,
    backgroundColor: "#5b6ef5",
  },

  // ── FORM PANEL ──
  formPanel: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingTop: 32,
    minHeight: 480,
  },

  portalLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#9aa0b4",
    marginBottom: 8,
  },

  formTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  formSub: {
    fontSize: 13,
    color: "#9aa0b4",
    marginBottom: 26,
  },

  // ── FIELD ──
  fieldWrap: {
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  fieldInput: {
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#111827",
  },

  fieldFocused: {
    borderColor: "#5b6ef5",
    borderWidth: 1,
  },

  // ── FORGOT ──
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 22,
    marginTop: -4,
  },

  forgotText: {
    fontSize: 12,
    color: "#5b6ef5",
    fontWeight: "500",
  },

  // ── SIGN IN BUTTON ──
  signInBtn: {
    backgroundColor: "#5b6ef5",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    shadowColor: "#5b6ef5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },

  signInText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // ── DIVIDER ──
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  divLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "#e5e7eb",
  },

  divText: {
    fontSize: 11,
    color: "#c4c9d4",
  },

  // ── REGISTER ──
  registerText: {
    textAlign: "center",
    fontSize: 13,
    color: "#9aa0b4",
  },

  registerLink: {
    color: "#5b6ef5",
    fontWeight: "700",
  },
});