package com.eduvault.wb.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "offline_pdfs")
data class OfflinePdfEntity(
    @PrimaryKey val materialId: String,
    val title: String,
    val titleBn: String,
    val board: String,
    val className: String,
    val semester: String,
    val subject: String,
    val chapter: String,
    val localFilePath: String,
    val fileSizeBytes: Long,
    val totalPages: Int,
    val lastReadPage: Int,
    val downloadedAtEpochMs: Long
)

@Entity(tableName = "local_bookmarks")
data class LocalBookmarkEntity(
    @PrimaryKey val bookmarkId: String,
    val materialId: String,
    val materialTitle: String,
    val pageNumber: Int,
    val note: String,
    val syncedToCloud: Boolean,
    val createdAtEpochMs: Long
)

@Entity(tableName = "local_annotations")
data class LocalAnnotationEntity(
    @PrimaryKey val annotationId: String,
    val materialId: String,
    val pageNumber: Int,
    val type: String, // "highlight" or "note"
    val content: String,
    val colorHex: String,
    val syncedToCloud: Boolean,
    val createdAtEpochMs: Long
)

@Dao
interface OfflineStudyDao {
    @Query("SELECT * FROM offline_pdfs ORDER BY downloadedAtEpochMs DESC")
    fun observeOfflinePdfs(): Flow<List<OfflinePdfEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertOfflinePdf(entity: OfflinePdfEntity)

    @Query("UPDATE offline_pdfs SET lastReadPage = :page WHERE materialId = :materialId")
    suspend fun updateLastReadPage(materialId: String, page: Int)

    @Query("DELETE FROM offline_pdfs WHERE materialId = :materialId")
    suspend fun deleteOfflinePdf(materialId: String)

    @Query("SELECT * FROM local_bookmarks WHERE materialId = :materialId ORDER BY pageNumber ASC")
    fun observeBookmarksForMaterial(materialId: String): Flow<List<LocalBookmarkEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertLocalBookmark(bookmark: LocalBookmarkEntity)

    @Query("SELECT * FROM local_annotations WHERE materialId = :materialId ORDER BY pageNumber ASC")
    fun observeAnnotationsForMaterial(materialId: String): Flow<List<LocalAnnotationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertLocalAnnotation(annotation: LocalAnnotationEntity)
}

@Database(
    entities = [
        OfflinePdfEntity::class,
        LocalBookmarkEntity::class,
        LocalAnnotationEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class EduVaultRoomDatabase : RoomDatabase() {
    abstract fun offlineStudyDao(): OfflineStudyDao
}
