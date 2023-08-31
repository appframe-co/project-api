import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import http from 'http';
import cors from 'cors';
import 'dotenv/config'

import Routes from "./routes";

const app: express.Application = express();
const server = http.createServer(app);

if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
}

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

Routes({ app });

app.use((req: Request, res: Response): void => {
    res.status(404).json({message: 'Not Found'});
});
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
    next(err);
});
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
    res.status(500).json({message: 'Something broke!'});
});

app.set('port', process.env.PORT);

server.listen(app.get('port'));