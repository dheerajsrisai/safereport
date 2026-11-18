package com.safereport.service;

import com.safereport.exception.ApiException;
import com.safereport.model.Evidence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

/**
 * Stores evidence outside any public folder. Images are re-encoded, which removes EXIF metadata
 * (GPS location, camera model, timestamps). Original file names are never stored.
 */
@Service
public class EvidenceStorageService {
    private static final Map<String, String> TYPES = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png",
            "pdf", "application/pdf", "mp4", "video/mp4", "webm", "video/webm", "mov", "video/quicktime");

    @Value("${app.upload-dir}") private String uploadDir;

    public Evidence store(MultipartFile file, int index) {
        try {
            String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
            ext = ext == null ? "" : ext.toLowerCase();
            if (!TYPES.containsKey(ext))
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported file type. Allowed: JPG, PNG, PDF, MP4, MOV, WebM");
            byte[] data = file.getBytes();
            switch (ext) {
                case "jpg", "jpeg" -> { data = cleanImage(data, "jpg"); ext = "jpg"; }
                case "png" -> data = cleanImage(data, "png");
                case "pdf" -> {
                    if (data.length < 5 || !new String(data, 0, 5, StandardCharsets.ISO_8859_1).equals("%PDF-"))
                        throw new ApiException(HttpStatus.BAD_REQUEST, "That file is not a valid PDF");
                }
                case "mp4" -> {
                    if (data.length < 12 || !new String(data, 4, 4, StandardCharsets.ISO_8859_1).equals("ftyp"))
                        throw new ApiException(HttpStatus.BAD_REQUEST, "That file is not a valid MP4 video");
                }
                case "webm" -> {
                    if (data.length < 4 || (data[0] & 0xFF) != 0x1A || (data[1] & 0xFF) != 0x45
                            || (data[2] & 0xFF) != 0xDF || (data[3] & 0xFF) != 0xA3)
                        throw new ApiException(HttpStatus.BAD_REQUEST, "That file is not a valid WebM video");
                }
                case "mov" -> {
                    String box = data.length < 12 ? "" : new String(data, 4, 4, StandardCharsets.ISO_8859_1);
                    if (!java.util.Set.of("ftyp", "moov", "mdat", "wide", "free", "skip").contains(box))
                        throw new ApiException(HttpStatus.BAD_REQUEST, "That file is not a valid MOV video");
                }
                default -> { }
            }
            String stored = UUID.randomUUID() + "." + ext;
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);
            Files.write(dir.resolve(stored), data);
            return new Evidence(stored, "evidence-" + (index + 1) + "." + ext, TYPES.get(ext), data.length);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store the evidence file");
        }
    }

    private byte[] cleanImage(byte[] data, String format) throws IOException {
        BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
        if (img == null) throw new ApiException(HttpStatus.BAD_REQUEST, "That file is not a valid image");
        if (format.equals("jpg") && img.getColorModel().hasAlpha()) {
            BufferedImage rgb = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.drawImage(img, 0, 0, Color.WHITE, null);
            g.dispose();
            img = rgb;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (!ImageIO.write(img, format, out)) throw new ApiException(HttpStatus.BAD_REQUEST, "Could not process the image");
        return out.toByteArray();
    }

    public Resource load(String fileName) {
        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path p = base.resolve(fileName).normalize();
        if (!p.startsWith(base) || !Files.exists(p)) throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
        return new FileSystemResource(p);
    }
}
