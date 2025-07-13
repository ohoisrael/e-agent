const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: 'AKIAVRUVVLGGCRVPMJP3',
    secretAccessKey: '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',
  },
});

const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory for S3 upload

router.post('/add', upload.array('images', 10), async (req, res) => {
  try {
    const { name, type, price, address, bedrooms, bathrooms, area, description, facilities, geolocation, status, phone } = req.body;
    console.log("Received body:", req.body);
    console.log("Received files:", req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const baseUrl = 'https://liasion.s3.eu-north-1.amazonaws.com/';
    const images = await Promise.all(req.files.map(async (file) => {
      const key = `properties/${Date.now()}-${file.originalname}`;
      const uploadParams = {
        Bucket: 'liasion',
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const parallelUploads3 = new Upload({
        client: s3,
        params: uploadParams,
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      });

      await parallelUploads3.done();
      return `${baseUrl}${key}`;
    }));

    const propertyData = {
      name,
      type,
      price: parseFloat(price),
      images,
      address,
      bedrooms: parseInt(bedrooms),
      bathrooms: parseInt(bathrooms),
      area: parseFloat(area),
      description,
      facilities: facilities ? JSON.parse(facilities) : [],
      geolocation,
      status: status || 'available',
      phone,
    };
    const property = new Property(propertyData);
    await property.save();
    console.log("Saved property:", property);
    res.status(201).json({ message: 'Property added', propertyId: property._id });
  } catch (error) {
    console.error("Error in /add:", error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, price, address, bedrooms, bathrooms, area, description, facilities, geolocation, status, phone } = req.body;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // Handle image updates
    let images = property.images || [];
    if (req.files && req.files.length > 0) {
      const baseUrl = 'https://liasion.s3.eu-north-1.amazonaws.com/';
      const newImages = await Promise.all(req.files.map(async (file) => {
        const key = `properties/${Date.now()}-${file.originalname}`;
        const uploadParams = {
          Bucket: 'liasion',
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const parallelUploads3 = new Upload({
          client: s3,
          params: uploadParams,
          queueSize: 4,
          partSize: 1024 * 1024 * 5,
          leavePartsOnError: false,
        });

        await parallelUploads3.done();
        return `${baseUrl}${key}`;
      }));
      images = [...images, ...newImages]; // Append new images, or replace if you want to overwrite
    }

    // Update property data
    property.name = name || property.name;
    property.type = type || property.type;
    property.price = price ? parseFloat(price) : property.price;
    property.images = images;
    property.address = address || property.address;
    property.bedrooms = bedrooms ? parseInt(bedrooms) : property.bedrooms;
    property.bathrooms = bathrooms ? parseInt(bathrooms) : property.bathrooms;
    property.area = area ? parseFloat(area) : property.area;
    property.description = description || property.description;
    property.facilities = facilities ? JSON.parse(facilities) : property.facilities;
    property.geolocation = geolocation || property.geolocation;
    property.status = status || property.status;
    property.phone = phone || property.phone;

    await property.save();
    console.log("Updated property:", property);
    res.json({ message: 'Property updated', propertyId: property._id });
  } catch (error) {
    console.error("Error in /put:", error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:propertyId/status', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status } = req.body;
    console.log("Received status update request for propertyId:", propertyId, "with status:", status); // Debug log

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    property.status = status;
    await property.save();
    console.log("Updated property status:", property);
    res.json({ message: 'Property status updated', propertyId: property._id, status: property.status });
  } catch (error) {
    console.error("Error in /status:", error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'available' }).sort({ createdAt: -1 }).limit(5);
    res.json(properties);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { filter, query, limit } = req.query;
    let queryObj = { status: 'available' };

    console.log("Received query params:", { filter, query, limit }); // Debug log

    if (query) {
      queryObj.$or = [
        { name: { $regex: new RegExp(query, 'i') } },
        { description: { $regex: new RegExp(query, 'i') } },
      ];
      console.log("Constructed queryObj:", queryObj); // Debug log
    }
    if (filter && filter !== 'All') {
      queryObj.type = filter;
    }

    const properties = await Property.find(queryObj)
      .limit(parseInt(limit) || 6)
      .sort({ createdAt: -1 });
    console.log("Found properties:", properties); // Debug log
    res.json(properties);
  } catch (error) {
    console.error("Backend error:", error.message);
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;