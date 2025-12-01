import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useTheme } from "./theme/ThemeProvider";
import { useRouter } from "expo-router";

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const handleSignup = () => {
    console.log("Signup clicked:", { email, password, confirm });

  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
    if (Platform.OS === "android" && passwordRef.current) {
      passwordRef.current.blur();
      setTimeout(() => passwordRef.current.focus(), 50);
    }
  };

  const toggleShowConfirm = () => {
    setShowConfirm(prev => !prev);
    if (Platform.OS === "android" && confirmRef.current) {
      confirmRef.current.blur();
      setTimeout(() => confirmRef.current.focus(), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        Sign up to get started
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.subtext}
          style={[styles.input, { color: colors.text, borderColor: colors.subtext + "44" }]}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/*Password Input*/}
        <View style={[styles.passwordContainer, { borderColor: colors.subtext + "44" }]}>
          <TextInput
            ref={passwordRef}
            placeholder="Password"
            placeholderTextColor={colors.subtext}
            style={[styles.passwordInput, { color: colors.text }]}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeButton}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/*Confirm Password Input*/}
        <View style={[styles.passwordContainer, { borderColor: colors.subtext + "44" }]}>
          <TextInput
            ref={confirmRef}
            placeholder="Confirm Password"
            placeholderTextColor={colors.subtext}
            style={[styles.passwordInput, { color: colors.text }]}
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
          />
          <TouchableOpacity onPress={toggleShowConfirm} style={styles.eyeButton}>
            <Feather name={showConfirm ? "eye" : "eye-off"} size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleSignup}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={[styles.link, { color: colors.accent }]}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/settings")} style={styles.backButton}>
        <Text style={[styles.backText, { color: colors.subtext }]}>← Back to Settings</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    
container: { 
 flex: 1, 
 alignItems: "center", 
 justifyContent: "center", 
 padding: 20 
},

title: { 
fontSize: 26, 
fontWeight: "700",
 marginBottom: 4 
},

subtitle: { 
 fontSize: 14, 
 marginBottom: 25 
},

card: {
 width: "100%",
 borderRadius: 16,
 padding: 20,
 elevation: 3,
},

input: {
 borderWidth: 1,
 borderRadius: 10,
 paddingHorizontal: 15,
 paddingVertical: 10,
 marginBottom: 15,
 fontSize: 14,
},

passwordContainer: {
 flexDirection: "row",
 alignItems: "center",
 borderWidth: 1,
 borderRadius: 10,
 paddingHorizontal: 15,
 marginBottom: 15,
},

passwordInput: {
 flex: 1,
 paddingVertical: 10,
 fontSize: 14,
},

eyeButton: {
 padding: 5,
},

button: {
 paddingVertical: 12,
 borderRadius: 10,
 alignItems: "center",
 marginTop: 5,
},

buttonText: { 
 color: "#fff", 
 fontWeight: "600", 
 fontSize: 15 
},

link: { 
 textAlign: "center", 
 marginTop: 15, 
 fontSize: 13 
},

backButton: { 
 marginTop: 25 
},

backText: { 
 fontSize: 13 
},

});
