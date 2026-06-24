const router = require('express').Router();
const { validateInvite, acceptInvite } = require('../controllers/adminController');

router.get('/validate', validateInvite);
router.post('/accept', acceptInvite);

module.exports = router;
