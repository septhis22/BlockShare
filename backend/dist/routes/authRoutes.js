"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authcontroller_1 = require("../controllers/authcontroller");
const validation_1 = require("../middlewares/validation");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post('/signup', validation_1.validateSignup, authcontroller_1.signup);
router.post('/login', validation_1.validateLogin, authcontroller_1.login);
router.get('/profile', auth_1.authenticateToken, authcontroller_1.getProfile);
router.get('/user', auth_1.authenticateToken, authcontroller_1.getUserByEmail);
exports.default = router;
