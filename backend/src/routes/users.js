import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
const secret = process.env.HASH_SECRET || "secret";
import User from "../models/User";
import passport from 'passport';

const router = new express.Router();
const saltRounds = 10;

router.post('/register', async (req, res, next) => {
    try{
        let input = req.body;
        if(!input.email || !input.password || !input.firstName){
            return res.status(500).json({
                status: "Failed",
                data: {
                    message: "Please provided necessary properties"
                }
            });
        }
        
        let user = await User.findOne({email: req.email});
        if(user){
            return res.status(400).json({
                status: "Failed",
                data: {
                    message: "Email is registered already"
                }
            });
        }
        const salt = await bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(input.password, salt);
        input.password = hash;
        user = await User.create({...input});
        return res.status(202).json({
            status: "Success",
            data: {
                user
            }
        })
    }
    catch(err){
        return res.status(500).json({
            status: "Failed",
            data: {
                message: 'Internal server error',
                err: err.message
            }
        });
    }

});

router.post("/login", async (req, res, next)  => {
    try{
        const input = req.body;
        if(!input.email || !input.password){
            return res.status(500).json({
                status: "Failed",
                data: {
                    message: "Email or password is missing"
                }
            });
        }

        const user = await User.findOne({email: input.email});
        if(!user){
            return res.status(404).json({
                status: "Failed",
                data: {
                    message: "Email not registered"
                }
            });
        }

        const isPassMatch = await bcrypt.compareSync(input.password, user.password);
        if(!isPassMatch){
            return res.status(500).json({
                status: "Failed",
                data: {
                    message: "Incorrect password or email"
                }
            });
        };

        const jwtValidity = '30d';
        const jwtPayload = {
            user,
            validity: jwtValidity,
            timestamp : Date.now(),
        }

        const token = jwt.sign(jwtPayload, secret, {
            expiresIn: jwtValidity
        });

        res.status(200).json({
            status: "Success",
            token,
            tokenAsHeader: `Bearer ${token}`
        })

    }
    catch(err){
        return res.status(500).json({
            status: "Failed",
            data: {
                message: 'Internal server error',
                err: err.message
            }
        });
    }
});

router.get('/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try{
        
        if(Object.keys(req.query).length > 0){
            const user = await User.find(req.query);
            return res.status(200).json({status: "Success", data: {user}})
        }
        const users = await User.find({});
        return res.status(200).json({status: "Success", data: {users}})
    }
    catch(err){
        res.status(500).json({
            status: "Failed",
            data: {
                message: 'Internal server error',
                err: err.message
            }
        })
    }
});

router.put('/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try{
        const id = req.params.id;
        let input = req.body;
        if(!id){
            return res.status(400).json({status: "Failed", data: {message: "Please provide an id"}})
        }

        if(input.password){
            const salt = await bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(input.password, salt);
            input.password = hash;
        }
        
        const user = await User.findByIdAndUpdate(id, {...input}, { new: true});
        return res.status(200).json({status: "Success", data: {user}})
    }
    catch(err){
        res.status(500).json({
            status: "Failed",
            data: {
                message: 'Internal server error',
                err: err.message
            }
        })
    }
});

router.delete('/:id', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    try{
        const id = req.params.id;
        if(!id){
            return res.status(400).json({status: "Failed", data: {message: "Please provide an id"}})
        }
        const user = await User.findByIdAndDelete(id);
        return res.status(200).json({status: "Success", data: {user}})
    }
    catch(err){
        res.status(500).json({
            status: "Failed",
            data: {
                message: 'Internal server error',
                err: err.message
            }
        })
    }
});

export default router;