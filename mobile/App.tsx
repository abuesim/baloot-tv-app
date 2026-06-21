import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";

// رابط التطبيق المنشور على Vercel
const APP_URL = "https://baloot-tv-app.vercel.app";
// النطاقات التي تُفتح داخل التطبيق (الباقي يُفتح في المتصفح)
const INTERNAL_HOSTS = ["baloot-tv-app.vercel.app"];

export default function App() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // زر الرجوع في أندرويد → رجوع داخل الـ WebView
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  function onNav(state: WebViewNavigation) {
    setCanGoBack(state.canGoBack);
  }

  // الروابط الخارجية تُفتح في المتصفح بدل WebView
  function onShouldStart(req: { url: string }): boolean {
    try {
      const host = new URL(req.url).hostname;
      const internal = INTERNAL_HOSTS.some(
        (h) => host === h || host.endsWith(`.${h}`),
      );
      if (!internal && /^https?:/.test(req.url)) {
        Linking.openURL(req.url);
        return false;
      }
    } catch {
      // تجاهل
    }
    return true;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor="#0a0a0e" />
      <ScrollView
        contentContainerStyle={styles.flex}
        // السحب للأسفل لإعادة التحميل
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#f5b042"
            colors={["#f5b042"]}
            onRefresh={() => {
              setRefreshing(true);
              webRef.current?.reload();
              setTimeout(() => setRefreshing(false), 1200);
            }}
          />
        }
        scrollEnabled={false}
      >
        <WebView
          ref={webRef}
          source={{ uri: APP_URL }}
          style={styles.flex}
          onNavigationStateChange={onNav}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          // ضروري لجلسة الدخول (الكوكيز)
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          // الصوت يشتغل بدون لمسة مستخدم
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          // رفع الملفات (الصوتيات) من الجهاز
          allowFileAccess
          allowsBackForwardNavigationGestures
          domStorageEnabled
          javaScriptEnabled
          originWhitelist={["*"]}
          setSupportMultipleWindows={false}
        />
      </ScrollView>

      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#f5b042" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0e" },
  flex: { flex: 1 },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0e",
  },
});
