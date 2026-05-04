# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ─── React Native runtime ────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.proguard.annotations.** { *; }
-keep class com.facebook.yoga.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ─── React Native annotations ────────────────────────────────────────────────
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }

# ─── Expo modules ────────────────────────────────────────────────────────────
-keep class expo.** { *; }
-keep class expo.modules.** { *; }
-dontwarn expo.**
-keep class versioned.host.exp.** { *; }

# ─── Firebase / RNFirebase ───────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.firebase.**

# ─── Reanimated / gesture handler / screens ──────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# ─── Vector icons (uses reflection to load fonts) ────────────────────────────
-keep class com.oblador.vectoricons.** { *; }

# ─── SVG ─────────────────────────────────────────────────────────────────────
-keep public class com.horcrux.svg.** { *; }

# ─── OkHttp / Okio (transitive deps) ─────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**

# ─── Kotlin reflect (used by Expo modules) ───────────────────────────────────
-keep class kotlin.reflect.** { *; }
-keep class kotlin.Metadata { *; }

# ─── Generic JS-bridge keep rules ────────────────────────────────────────────
-keepattributes JavascriptInterface
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
