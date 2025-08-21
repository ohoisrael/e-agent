const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const path = require('path');
const auth = require('../middleware/auth');

const s3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: 'AKIAVRUVVLGGCRVPMJP3',
    secretAccessKey: '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',
  },
});

const upload = multer({ storage: multer.memoryStorage() });

router.post('/add', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { name, type, price, address, bedrooms, bathrooms, area, description, facilities, geolocation, status, phone } = req.body;
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
      approvalStatus: 'pending',
      phone,
    };
    const property = new Property(propertyData);
    await property.save();
    res.status(201).json({ message: 'Property added, pending approval', propertyId: property._id });
  } catch (error) {
    console.error("Error in /add:", error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, price, address, bedrooms, bathrooms, area, description, facilities, geolocation, status, phone } = req.body;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

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
      images = [...images, ...newImages];
    }

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
    property.approvalStatus = 'pending';
    property.phone = phone || property.phone;

    await property.save();
    res.json({ message: 'Property updated, pending approval', propertyId: property._id });
  } catch (error) {
    console.error("Error in /put:", error);
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can approve properties' });
    }
    const { id } = req.params;
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status' });
    }
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    property.approvalStatus = approvalStatus;
    await property.save();
    res.json({ message: `Property ${approvalStatus}`, propertyId: property._id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:propertyId/status', auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.approvalStatus !== 'approved' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Property must be approved by superadmin first' });
    }

    property.status = status;
    await property.save();
    res.json({ message: 'Property status updated', propertyId: property._id, status: property.status });
  } catch (error) {
    console.error("Error in /status:", error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can view pending properties' });
    }
    const properties = await Property.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const properties = await Property.find({ approvalStatus: 'approved' }).sort({ createdAt: -1 }).limit(5);
    res.json(properties);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { filter, query, limit } = req.query;
    let queryObj = { approvalStatus: 'approved' };

    if (query) {
      queryObj.$or = [
        { name: { $regex: new RegExp(query, 'i') } },
        { description: { $regex: new RegExp(query, 'i') } },
      ];
    }
    if (filter && filter !== 'All') {
      queryObj.type = filter;
    }

    const properties = await Property.find(queryObj)
      .limit(parseInt(limit) || 6)
      .sort({ createdAt: -1 });
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
    if (property.approvalStatus !== 'approved' && req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: 'Property not approved' });
    }
    res.json(property);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;