import { devLog } from "@/lib/utils/productionLogger";

/**
 * Manual Project Update Script
 * 
 * This script allows you to directly update a project in Firestore.
 * It's useful when the normal update flow doesn't work properly.
 * 
 * Usage:
 * node manual-project-update.js <projectId> <field> <value>
 * 
 * Example:
 * node manual-project-update.js zx7y8c9de0f1g2h3i4j5 valorProjeto 150000
 */

// Initialize Firebase
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateProject(projectId, field, value) {
  try {
    devLog.log(`Starting manual update of project ${projectId}`);
    devLog.log(`Will update field "${field}" to value "${value}"`);
    
    // Get the project document
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      devLog.error(`Project with ID ${projectId} not found.`);
      return false;
    }
    
    // Get the current project data
    const projectData = projectDoc.data();
    devLog.log('Current project data:', {
      id: projectId,
      [field]: projectData[field],
      allFields: Object.keys(projectData)
    });
    
    // Parse the value if needed
    let parsedValue = value;
    if (field === 'valorProjeto' || field === 'potencia') {
      if (value.toLowerCase() === 'null') {
        parsedValue = null;
      } else {
        parsedValue = Number(value);
        if (isNaN(parsedValue)) {
          devLog.error(`Invalid numeric value: ${value}`);
          return false;
        }
      }
    }
    
    // Create the update object
    const updateObject = {
      [field]: parsedValue,
      updatedAt: serverTimestamp(),
      lastUpdateBy: {
        uid: 'script',
        email: 'manual-update-script',
        role: 'script',
        timestamp: serverTimestamp()
      }
    };
    
    devLog.log('Update object:', updateObject);
    
    // Update the document
    await setDoc(projectRef, updateObject, { merge: true });
    devLog.log('Update successful.');
    
    // Verify the update
    const verifyDoc = await getDoc(projectRef);
    const verifyData = verifyDoc.data();
    devLog.log('Verification result:', {
      field,
      expected: parsedValue,
      actual: verifyData[field],
      success: verifyData[field] === parsedValue || 
        (field === 'valorProjeto' && Number(verifyData[field]) === parsedValue)
    });
    
    return true;
  } catch (error) {
    devLog.error('Error updating project:', error);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    devLog.log('Usage: node manual-project-update.js <projectId> <field> <value>');
    devLog.log('Example: node manual-project-update.js zx7y8c9de0f1g2h3i4j5 valorProjeto 150000');
    process.exit(1);
  }
  
  const [projectId, field, value] = args;
  
  try {
    const success = await updateProject(projectId, field, value);
    if (success) {
      devLog.log('Project updated successfully.');
    } else {
      devLog.error('Failed to update project.');
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    devLog.error('Error:', error);
    process.exit(1);
  }
}

main(); 