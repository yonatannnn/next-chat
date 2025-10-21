import 'package:firebase_core/firebase_core.dart';
import 'package:mobile/firebase_options.dart';

// This file encapsulates safe Firebase initialization.
// Run `flutterfire configure` to generate `firebase_options.dart` and then
// this helper will initialize using the generated options when present.

Future<void> safeInitializeFirebase() async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
}



