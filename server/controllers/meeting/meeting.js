const MeetingHistory = require('../../model/schema/meeting');
const mongoose = require('mongoose');

// Add a new meeting
const add = async (req, res) => {
    try {
        const { agenda, attendes, attendesLead, location, related, dateTime, notes, createBy } = req.body;

        // Validation: check if the 'createBy' field is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(createBy)) {
            return res.status(400).json({ error: 'Invalid createBy value' });
        }

        // Create new meeting document
        const newMeeting = new MeetingHistory({
            agenda,
            attendes,
            attendesLead,
            location,
            related,
            dateTime,
            notes,
            createBy,
        });

        // Save the new meeting document to the database
        const result = await newMeeting.save();

        res.status(200).json({ result });
    } catch (err) {
        console.error('Error while adding meeting:', err);
        res.status(400).json({ error: 'Failed to create meeting', details: err.message });
    }
};

// Get a list of meetings based on query parameters
const index = async (req, res) => {
    try {
        const query = req.query;

        // If 'createBy' is passed as a query parameter, ensure it is a valid ObjectId
        if (query.createBy) {
            query.createdBy = new mongoose.Types.ObjectId(query.createBy);
        }

        // Use aggregate to fetch meeting details with joined data (Contacts, Leads, User)
        const result = await MeetingHistory.aggregate([
            {
                // Lookup for the 'Contact' collection and populate 'attendes' field
                $lookup: {
                    from: 'Contacts', // Name of the collection (not model)
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendesNames'
                }
            },
            {
                // Lookup for the 'Lead' collection and populate 'attendesLead' field
                $lookup: {
                    from: 'Leads', // Name of the collection (not model)
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLeadNames'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            // Handle empty arrays for 'attendes'
            {
                $unwind: {
                    path: '$attendesRef',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Handle empty arrays for 'attendesLead'
            {
                $unwind: {
                    path: '$attendesLeadRef',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createdByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },

                }
            },
            {
                // Project to extract only the necessary fields (names of contacts and leads)
                $project: {
                    _id: 1,
                    agenda: 1,
                    dateTime: 1,
                    location: 1,
                    related: 1,
                    notes: 1,
                    createdBy: 1,
                    deleted: 1,
                    createdByName: 1,
                    timestamp: 1,
                    attendes: 1,
                    attendesLead: 1,
                    'attendesNames.fullName': 1, // Assuming 'name' is the field for the contact name
                    'attendesLeadNames.leadName': 1 // Assuming 'name' is the field for the lead name
                }
            }
        ])

        res.status(200).json(result);
    } catch (err) {
        console.error('Error while fetching meetings:', err);
        res.status(400).json({ error: 'Failed to fetch meetings', details: err.message });
    }
};

// View details of a specific meeting by ID
const view = async (req, res) => {
    try {
        const meetingId = req.params.id;

        // Find meeting by ID
        let result = await MeetingHistory.findOne({ _id: meetingId });



        if (!result) return res.status(404).json({ message: 'No data found for this meeting.' });

        // Aggregate data for the meeting
        let response = await MeetingHistory.aggregate([
            { $match: { _id: result._id } },
            {
                // Lookup for the 'Contact' collection and populate 'attendes' field
                $lookup: {
                    from: 'Contacts', // Name of the collection (not model)
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendesNames'
                }
            },
            {
                // Lookup for the 'Lead' collection and populate 'attendesLead' field
                $lookup: {
                    from: 'Leads', // Name of the collection (not model)
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLeadNames'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            // Handle empty arrays for 'attendes'
            {
                $unwind: {
                    path: '$attendesRef',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Handle empty arrays for 'attendesLead'
            {
                $unwind: {
                    path: '$attendesLeadRef',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createdByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },

                }
            },
            {
                // Project to extract only the necessary fields (names of contacts and leads)
                $project: {
                    _id: 1,
                    agenda: 1,
                    dateTime: 1,
                    location: 1,
                    related: 1,
                    notes: 1,
                    createBy: 1,
                    deleted: 1,
                    createdByName: 1,
                    timestamp: 1,
                    attendes: 1,
                    attendesLead: 1,
                    'attendesNames.fullName': 1, // Assuming 'name' is the field for the contact name
                    'attendesLeadNames.leadName': 1 // Assuming 'name' is the field for the lead name
                }
            }
        ])



        res.status(200).json(response[0]);
    } catch (err) {
        console.error('Error while fetching meeting:', err);
        res.status(400).json({ error: 'Failed to fetch meeting', details: err.message });
    }
};


// Delete a single meeting by ID
const deleteOne = async (req, res) => {
    try {
        const meetingId = req.params.id;

        // Find and delete the meeting by ID
        const result = await MeetingHistory.findByIdAndDelete(meetingId);

        if (!result) {
            return res.status(404).json({ message: 'Meeting not found or already deleted.' });
        }

        res.status(200).json({ message: 'Meeting deleted successfully', result });
    } catch (err) {
        console.error('Error while deleting meeting:', err);
        res.status(400).json({ error: 'Failed to delete meeting', details: err.message });
    }
};

const deleteMany = async (req, res) => {
    try {
        const query = req.query;

        // Delete multiple meetings that match the query criteria
        const result = await MeetingHistory.deleteMany(query);

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No meetings found to delete.' });
        }

        res.status(200).json({ message: `${result.deletedCount} meeting(s) deleted successfully` });
    } catch (err) {
        console.error('Error while deleting meetings:', err);
        res.status(400).json({ error: 'Failed to delete meetings', details: err.message });
    }
}


module.exports = { add, index, view, deleteOne, deleteMany }