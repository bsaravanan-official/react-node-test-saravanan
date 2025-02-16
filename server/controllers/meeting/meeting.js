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
            query.createBy = new mongoose.Types.ObjectId(query.createBy);
        }

        // Use aggregate to fetch meeting details with joined data (Contacts, Leads, User)
        const result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLeadRef'
                }
            },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendesRef'
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
            { $unwind: { path: '$attendesRef', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$attendesLeadRef', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },
                    attendesNames: {
                        $map: {
                            input: '$attendesRef',
                            as: 'contact',
                            in: { $concat: ['$$contact.firstName', ' ', '$$contact.lastName'] }
                        }
                    },
                    attendesLeadNames: {
                        $map: {
                            input: '$attendesLeadRef',
                            as: 'lead',
                            in: '$$lead.leadName'
                        }
                    }
                }
            },
            { $project: { attendesRef: 0, attendesLeadRef: 0, users: 0 } }
        ]);

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
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendesRef'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLeadRef'
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
            { $unwind: { path: '$attendesRef', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$attendesLeadRef', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createByName: { $concat: ['$users.firstName', ' ', '$users.lastName'] },
                    attendesNames: {
                        $map: {
                            input: '$attendesRef',
                            as: 'contact',
                            in: { $concat: ['$$contact.firstName', ' ', '$$contact.lastName'] }
                        }
                    },
                    attendesLeadNames: {
                        $map: {
                            input: '$attendesLeadRef',
                            as: 'lead',
                            in: '$$lead.leadName'
                        }
                    }
                }
            },
            { $project: { attendesRef: 0, attendesLeadRef: 0, users: 0 } }
        ]);

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