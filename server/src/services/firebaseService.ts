import admin from 'firebase-admin'
import { logger } from '../utils/logger'

export interface FirebaseConfig {
  projectId: string
  privateKey?: string
  clientEmail?: string
  databaseURL?: string
  storageBucket?: string
}

export interface FirebaseProject {
  id: string
  name: string
  config: FirebaseConfig
  services: {
    auth: boolean
    firestore: boolean
    storage: boolean
    analytics: boolean
    messaging: boolean
  }
}

export class FirebaseService {
  private static instance: FirebaseService
  private adminApp?: admin.app.App

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService()
    }
    return FirebaseService.instance
  }

  async initializeFirebase(config: FirebaseConfig): Promise<void> {
    try {
      if (this.adminApp) {
        // Re-initialize if config changes
        await this.adminApp.delete()
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: config.projectId,
        private_key: config.privateKey?.replace(/\\n/g, '\n'),
        client_email: config.clientEmail,
      }

      this.adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: config.databaseURL,
        storageBucket: config.storageBucket,
      }, `fluttery-${config.projectId}`)

      logger.info(`Firebase initialized for project: ${config.projectId}`)

    } catch (error) {
      logger.error('Error initializing Firebase:', error)
      throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  generateFirebaseConfig(projectId: string, webApiKey?: string): string {
    return `
// Firebase configuration
const firebaseConfig = {
  apiKey: "${webApiKey || 'YOUR_WEB_API_KEY'}",
  authDomain: "${projectId}.firebaseapp.com",
  projectId: "${projectId}",
  storageBucket: "${projectId}.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
`
  }

  generateFirebaseAuthCode(includeEmailAuth: boolean = true, includeGoogleAuth: boolean = false): string {
    let code = `
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Auth state changes stream
  Stream<User?> get authStateChanges => _auth.authStateChanges();
`

    if (includeEmailAuth) {
      code += `
  // Sign in with email and password
  Future<UserCredential?> signInWithEmailAndPassword(String email, String password) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      print('Error signing in: \${e.message}');
      return null;
    }
  }

  // Register with email and password
  Future<UserCredential?> registerWithEmailAndPassword(String email, String password) async {
    try {
      return await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      print('Error registering: \${e.message}');
      return null;
    }
  }

  // Send password reset email
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      print('Error sending reset email: \${e.message}');
    }
  }`
    }

    if (includeGoogleAuth) {
      code += `
  // Sign in with Google
  Future<UserCredential?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) return null;

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      return await _auth.signInWithCredential(credential);
    } catch (e) {
      print('Error signing in with Google: \$e');
      return null;
    }
  }`
    }

    code += `
  // Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }
}

// Auth wrapper widget
class AuthWrapper extends StatelessWidget {
  final Widget authenticatedChild;
  final Widget unauthenticatedChild;

  const AuthWrapper({
    Key? key,
    required this.authenticatedChild,
    required this.unauthenticatedChild,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return authenticatedChild;
        }
        return unauthenticatedChild;
      },
    );
  }
}
`

    return code
  }

  generateFirestoreCode(collectionName: string = 'items'): string {
    return `
import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final String collectionName = '${collectionName}';

  // Get collection reference
  CollectionReference get collection => _db.collection(collectionName);

  // Get all documents
  Stream<QuerySnapshot> getItems() {
    return collection.snapshots();
  }

  // Get document by ID
  Future<DocumentSnapshot> getItem(String id) {
    return collection.doc(id).get();
  }

  // Add new document
  Future<DocumentReference> addItem(Map<String, dynamic> data) {
    return collection.add({
      ...data,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Update document
  Future<void> updateItem(String id, Map<String, dynamic> data) {
    return collection.doc(id).update({
      ...data,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Delete document
  Future<void> deleteItem(String id) {
    return collection.doc(id).delete();
  }

  // Query documents
  Stream<QuerySnapshot> queryItems({
    String? field,
    dynamic value,
    int limit = 10,
  }) {
    Query query = collection.limit(limit);

    if (field != null && value != null) {
      query = query.where(field, isEqualTo: value);
    }

    return query.snapshots();
  }
}

// Firestore list widget
class FirestoreList extends StatelessWidget {
  final String collectionName;
  final Widget Function(BuildContext, DocumentSnapshot) itemBuilder;

  const FirestoreList({
    Key? key,
    required this.collectionName,
    required this.itemBuilder,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection(collectionName).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Text('Error: \${snapshot.error}');
        }

        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return const Center(child: Text('No items found'));
        }

        return ListView.builder(
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            return itemBuilder(context, snapshot.data!.docs[index]);
          },
        );
      },
    );
  }
}
`
  }

  generateFirebaseStorageCode(): string {
    return `
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Upload file
  Future<String?> uploadFile(File file, String path) async {
    try {
      final ref = _storage.ref().child(path);
      final uploadTask = ref.putFile(file);
      final snapshot = await uploadTask;
      return await snapshot.ref.getDownloadURL();
    } catch (e) {
      print('Error uploading file: \$e');
      return null;
    }
  }

  // Upload image from camera/gallery
  Future<String?> uploadImage(ImageSource source, String folder) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source);

      if (pickedFile == null) return null;

      final file = File(pickedFile.path);
      final fileName = '\${DateTime.now().millisecondsSinceEpoch}.jpg';

      return await uploadFile(file, '\$folder/\$fileName');
    } catch (e) {
      print('Error picking/uploading image: \$e');
      return null;
    }
  }

  // Delete file
  Future<void> deleteFile(String url) async {
    try {
      final ref = _storage.refFromURL(url);
      await ref.delete();
    } catch (e) {
      print('Error deleting file: \$e');
    }
  }

  // Get download URL
  Future<String> getDownloadURL(String path) async {
    return await _storage.ref(path).getDownloadURL();
  }
}

// Image upload widget
class ImageUploadWidget extends StatefulWidget {
  final Function(String) onImageUploaded;
  final String folder;

  const ImageUploadWidget({
    Key? key,
    required this.onImageUploaded,
    this.folder = 'images',
  }) : super(key: key);

  @override
  _ImageUploadWidgetState createState() => _ImageUploadWidgetState();
}

class _ImageUploadWidgetState extends State<ImageUploadWidget> {
  final StorageService _storageService = StorageService();
  bool _uploading = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ElevatedButton(
          onPressed: _uploading ? null : () => _uploadImage(ImageSource.gallery),
          child: _uploading
            ? const CircularProgressIndicator()
            : const Text('Upload from Gallery'),
        ),
        ElevatedButton(
          onPressed: _uploading ? null : () => _uploadImage(ImageSource.camera),
          child: const Text('Take Photo'),
        ),
      ],
    );
  }

  Future<void> _uploadImage(ImageSource source) async {
    setState(() => _uploading = true);

    final url = await _storageService.uploadImage(source, widget.folder);

    setState(() => _uploading = false);

    if (url != null) {
      widget.onImageUploaded(url);
    }
  }
}
`
  }

  async validateFirebaseConfig(config: FirebaseConfig): Promise<{ valid: boolean, errors: string[] }> {
    const errors: string[] = []

    if (!config.projectId) {
      errors.push('Project ID is required')
    }

    if (!config.privateKey) {
      errors.push('Private key is required')
    }

    if (!config.clientEmail) {
      errors.push('Client email is required')
    }

    // Test connection if all required fields are present
    if (errors.length === 0) {
      try {
        await this.initializeFirebase(config)

        // Test Firestore access
        if (this.adminApp) {
          await this.adminApp.firestore().collection('test').limit(1).get()
        }

      } catch (error) {
        errors.push(`Firebase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  generateFirebaseSecurityRules(): {
    firestore: string
    storage: string
  } {
    return {
      firestore: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public read, authenticated write for todos
    match /todos/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`,
      storage: `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload to their own folder
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public images (read-only for unauthenticated, read-write for authenticated)
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Default: authenticated users only
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`
    }
  }
}

export const firebaseService = FirebaseService.getInstance()