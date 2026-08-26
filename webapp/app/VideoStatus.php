<?php

namespace App;

enum VideoStatus: string
{
    case AwaitingUpload = 'awaiting_upload';
    case Preprocessing = 'preprocessing';
    case Ready = 'ready';
    case Publishing = 'publishing';
    case Live = 'live';
    case Failed = 'failed';
}
