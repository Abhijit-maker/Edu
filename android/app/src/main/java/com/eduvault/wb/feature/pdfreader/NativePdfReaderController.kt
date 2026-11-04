package com.eduvault.wb.feature.pdfreader

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.LruCache
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Native Android PdfRenderer engine with LRU Bitmap caching and thread-safe mutex locking
 * for smooth zooming, page navigation, and offline reading on low-end devices.
 */
@Singleton
class NativePdfReaderController @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val renderMutex = Mutex()
    private var fileDescriptor: ParcelFileDescriptor? = null
    private var pdfRenderer: PdfRenderer? = null

    // Cache up to 16MB of rendered PDF page bitmaps
    private val bitmapCache = object : LruCache<String, Bitmap>(16 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap): Int = value.byteCount
    }

    suspend fun openPdfFile(file: File): Result<Int> = withContext(Dispatchers.IO) {
        renderMutex.withLock {
            runCatching {
                closeInternal()
                val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
                val renderer = PdfRenderer(descriptor)
                fileDescriptor = descriptor
                pdfRenderer = renderer
                renderer.pageCount
            }
        }
    }

    suspend fun renderPage(
        materialId: String,
        pageIndex: Int,
        scaleFactor: Float = 2.0f
    ): Result<Bitmap> = withContext(Dispatchers.IO) {
        val cacheKey = "${materialId}_p${pageIndex}_s${scaleFactor}"
        bitmapCache.get(cacheKey)?.let { cached ->
            if (!cached.isRecycled) return@withContext Result.success(cached)
        }

        renderMutex.withLock {
            runCatching {
                val renderer = pdfRenderer ?: error("PdfRenderer is not initialized")
                require(pageIndex in 0 until renderer.pageCount) { "Invalid page index: $pageIndex" }

                renderer.openPage(pageIndex).use { page ->
                    val width = (page.width * scaleFactor).toInt().coerceAtLeast(1)
                    val height = (page.height * scaleFactor).toInt().coerceAtLeast(1)
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    bitmapCache.put(cacheKey, bitmap)
                    bitmap
                }
            }
        }
    }

    suspend fun close() = withContext(Dispatchers.IO) {
        renderMutex.withLock {
            closeInternal()
        }
    }

    private fun closeInternal() {
        runCatching { pdfRenderer?.close() }
        runCatching { fileDescriptor?.close() }
        pdfRenderer = null
        fileDescriptor = null
        bitmapCache.evictAll()
    }
}
