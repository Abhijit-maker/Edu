package com.eduvault.wb.di

import android.content.Context
import androidx.room.Room
import com.eduvault.wb.BuildConfig
import com.eduvault.wb.data.local.EduVaultRoomDatabase
import com.eduvault.wb.data.local.OfflineStudyDao
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object EduVaultAppModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore =
        FirebaseFirestore.getInstance(FirebaseApp.getInstance(), BuildConfig.FIRESTORE_DATABASE_ID)

    @Provides
    @Singleton
    fun provideFirebaseStorage(): FirebaseStorage = FirebaseStorage.getInstance()

    @Provides
    @Singleton
    fun provideRoomDatabase(@ApplicationContext context: Context): EduVaultRoomDatabase =
        Room.databaseBuilder(
            context,
            EduVaultRoomDatabase::class.java,
            "eduvault_offline.db"
        ).fallbackToDestructiveMigration().build()

    @Provides
    @Singleton
    fun provideOfflineStudyDao(database: EduVaultRoomDatabase): OfflineStudyDao =
        database.offlineStudyDao()
}
